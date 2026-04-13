from flask import Flask, request, jsonify, render_template
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from flask_cors import CORS
import re
from datetime import datetime
import os

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///global_citizen.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
bcrypt = Bcrypt(app)
CORS(app)

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def set_password(self, password):
        self.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')

    def check_password(self, password):
        return bcrypt.check_password_hash(self.password_hash, password)

class Report(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    location = db.Column(db.String(100), nullable=False)
    category = db.Column(db.String(50), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    user = db.relationship('User', backref=db.backref('reports', lazy=True))

def sanitize_input(input_string):
    if not input_string:
        return ""
    # Remove HTML tags
    clean = re.sub(r'<[^>]+>', '', input_string)
    # Remove potentially dangerous characters
    clean = re.sub(r'[<>"\';]', '', clean)
    # Trim whitespace
    clean = clean.strip()
    return clean

def categorize_report(title, description):
    content = (title + " " + description).lower()
    if any(keyword in content for keyword in ['migration', 'immigrant', 'refugee', 'border']):
        return 'Migration'
    elif any(keyword in content for keyword in ['security', 'terror', 'threat', 'attack']):
        return 'Security'
    elif any(keyword in content for keyword in ['logistics', 'supply', 'transport', 'delivery']):
        return 'Logistics'
    else:
        return 'General'

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/users/register', methods=['POST'])
def register_user():
    try:
        data = request.get_json()
        
        username = sanitize_input(data.get('username', ''))
        email = sanitize_input(data.get('email', ''))
        password = data.get('password', '')
        
        if not username or not email or not password:
            return jsonify({'error': 'All fields are required'}), 400
        
        if len(password) < 8:
            return jsonify({'error': 'Password must be at least 8 characters long'}), 400
        
        if User.query.filter_by(username=username).first():
            return jsonify({'error': 'Username already exists'}), 400
        
        if User.query.filter_by(email=email).first():
            return jsonify({'error': 'Email already exists'}), 400
        
        user = User(username=username, email=email)
        user.set_password(password)
        
        db.session.add(user)
        db.session.commit()
        
        return jsonify({'message': 'User registered successfully', 'user_id': user.id}), 201
        
    except Exception as e:
        return jsonify({'error': 'Registration failed'}), 500

@app.route('/api/users/login', methods=['POST'])
def login_user():
    try:
        data = request.get_json()
        
        username = sanitize_input(data.get('username', ''))
        password = data.get('password', '')
        
        if not username or not password:
            return jsonify({'error': 'Username and password are required'}), 400
        
        user = User.query.filter_by(username=username).first()
        
        if user and user.check_password(password):
            return jsonify({
                'message': 'Login successful',
                'user_id': user.id,
                'username': user.username
            }), 200
        else:
            return jsonify({'error': 'Invalid credentials'}), 401
            
    except Exception as e:
        return jsonify({'error': 'Login failed'}), 500

@app.route('/api/reports', methods=['GET'])
def get_reports():
    try:
        reports = Report.query.order_by(Report.timestamp.desc()).all()
        return jsonify([{
            'id': report.id,
            'title': report.title,
            'description': report.description,
            'location': report.location,
            'category': report.category,
            'timestamp': report.timestamp.isoformat(),
            'user': report.user.username
        } for report in reports]), 200
        
    except Exception as e:
        return jsonify({'error': 'Failed to fetch reports'}), 500

@app.route('/api/reports', methods=['POST'])
def create_report():
    try:
        data = request.get_json()
        
        title = sanitize_input(data.get('title', ''))
        description = sanitize_input(data.get('description', ''))
        location = sanitize_input(data.get('location', ''))
        user_id = data.get('user_id')
        
        if not title or not description or not location or not user_id:
            return jsonify({'error': 'All fields are required'}), 400
        
        if not User.query.get(user_id):
            return jsonify({'error': 'Invalid user'}), 400
        
        category = categorize_report(title, description)
        
        report = Report(
            title=title,
            description=description,
            location=location,
            category=category,
            user_id=user_id
        )
        
        db.session.add(report)
        db.session.commit()
        
        return jsonify({
            'message': 'Report created successfully',
            'report_id': report.id,
            'category': category
        }), 201
        
    except Exception as e:
        return jsonify({'error': 'Failed to create report'}), 500

@app.route('/api/security-monitor', methods=['GET'])
def get_security_monitor():
    try:
        security_reports = Report.query.filter_by(category='Security').order_by(Report.timestamp.desc()).limit(10).all()
        return jsonify([{
            'id': report.id,
            'title': report.title,
            'description': report.description,
            'location': report.location,
            'timestamp': report.timestamp.isoformat(),
            'user': report.user.username
        } for report in security_reports]), 200
        
    except Exception as e:
        return jsonify({'error': 'Failed to fetch security reports'}), 500

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, host='0.0.0.0', port=5000)
