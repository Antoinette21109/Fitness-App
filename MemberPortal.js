import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './MemberPortal.css';

const MemberPortal = ({ user }) => {
  const [workouts, setWorkouts] = useState([]);
  const [mealPlans, setMealPlans] = useState([]);
  const [progress, setProgress] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedCoach, setSelectedCoach] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [activeTab, setActiveTab] = useState('workouts');
  const [progressForm, setProgressForm] = useState({
    weight: '',
    bodyFat: '',
    muscleMass: '',
    measurements: { chest: '', waist: '', hips: '', arms: '', thighs: '' },
    notes: '',
  });

  useEffect(() => {
    fetchWorkouts();
    fetchMealPlans();
    fetchProgress();
    fetchMessages();
  }, []);

  const fetchWorkouts = async () => {
    try {
      const response = await axios.get('/api/workouts');
      setWorkouts(response.data);
    } catch (error) {
      console.error('Error fetching workouts:', error);
    }
  };

  const fetchMealPlans = async () => {
    try {
      const response = await axios.get('/api/meal-plans');
      setMealPlans(response.data);
    } catch (error) {
      console.error('Error fetching meal plans:', error);
    }
  };

  const fetchProgress = async () => {
    try {
      const response = await axios.get('/api/progress');
      setProgress(response.data);
    } catch (error) {
      console.error('Error fetching progress:', error);
    }
  };

  const fetchMessages = async () => {
    try {
      // Fetch messages from coach (assuming coach ID is known)
      const response = await axios.get('/api/messages/coach-id');
      setMessages(response.data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const handleProgressSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    Object.keys(progressForm).forEach(key => {
      if (key === 'measurements') {
        formData.append(key, JSON.stringify(progressForm[key]));
      } else {
        formData.append(key, progressForm[key]);
      }
    });
    
    try {
      await axios.post('/api/progress', formData);
      alert('Progress saved successfully!');
      fetchProgress();
      setProgressForm({
        weight: '',
        bodyFat: '',
        muscleMass: '',
        measurements: { chest: '', waist: '', hips: '', arms: '', thighs: '' },
        notes: '',
      });
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedCoach) return;
    
    try {
      await axios.post('/api/messages', {
        to: selectedCoach,
        message: newMessage,
      });
      setNewMessage('');
      fetchMessages();
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  return (
    <div className="member-portal">
      <div className="portal-header">
        <h1>Welcome back, {user.name}!</h1>
        <div className="membership-badge">Membership: {user.membershipType}</div>
      </div>

      <div className="portal-tabs">
        <button className={activeTab === 'workouts' ? 'active' : ''} onClick={() => setActiveTab('workouts')}>
          Workout Plans
        </button>
        <button className={activeTab === 'nutrition' ? 'active' : ''} onClick={() => setActiveTab('nutrition')}>
          Nutrition Plans
        </button>
        <button className={activeTab === 'progress' ? 'active' : ''} onClick={() => setActiveTab('progress')}>
          Progress Tracking
        </button>
        <button className={activeTab === 'chat' ? 'active' : ''} onClick={() => setActiveTab('chat')}>
          Coach Chat
        </button>
      </div>

      <div className="portal-content">
        {activeTab === 'workouts' && (
          <div className="workouts-section">
            <h2>Your Workout Plans</h2>
            <div className="workouts-list">
              {workouts.map(workout => (
                <div key={workout._id} className="workout-card">
                  <h3>{workout.title}</h3>
                  <p>{workout.description}</p>
                  <div className="workout-meta">
                    <span>Duration: {workout.duration} min</span>
                    <span>Difficulty: {workout.difficulty}</span>
                  </div>
                  <button className="btn-view">View Details</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'nutrition' && (
          <div className="nutrition-section">
            <h2>Your Meal Plans</h2>
            <div className="meal-plans-list">
              {mealPlans.map(plan => (
                <div key={plan._id} className="meal-card">
                  <h3>{plan.title}</h3>
                  <p>{plan.description}</p>
                  <div className="meal-stats">
                    <span>Calories: {plan.calories}</span>
                  </div>
                  <div className="meals-preview">
                    {plan.meals.slice(0, 3).map((meal, idx) => (
                      <div key={idx} className="meal-item">
                        <strong>{meal.type}:</strong> {meal.name}
                      </div>
                    ))}
                  </div>
                  <button className="btn-view">View Full Plan</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'progress' && (
          <div className="progress-section">
            <div className="progress-form">
              <h3>Log Your Progress</h3>
              <form onSubmit={handleProgressSubmit}>
                <div className="form-group">
                  <label>Weight (kg)</label>
                  <input type="number" value={progressForm.weight} onChange={(e) => setProgressForm({...progressForm, weight: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label>Body Fat %</label>
                  <input type="number" step="0.1" value={progressForm.bodyFat} onChange={(e) => setProgressForm({...progressForm, bodyFat: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Muscle Mass (kg)</label>
                  <input type="number" step="0.1" value={progressForm.muscleMass} onChange={(e) => setProgressForm({...progressForm, muscleMass: e.target.value})} />
                </div>
                <h4>Measurements (cm)</h4>
                <div className="measurements-grid">
                  <input type="number" placeholder="Chest" value={progressForm.measurements.chest} onChange={(e) => setProgressForm({...progressForm, measurements: {...progressForm.measurements, chest: e.target.value}})} />
                  <input type="number" placeholder="Waist" value={progressForm.measurements.waist} onChange={(e) => setProgressForm({...progressForm, measurements: {...progressForm.measurements, waist: e.target.value}})} />
                  <input type="number" placeholder="Hips" value={progressForm.measurements.hips} onChange={(e) => setProgressForm({...progressForm, measurements: {...progressForm.measurements, hips: e.target.value}})} />
                  <input type="number" placeholder="Arms" value={progressForm.measurements.arms} onChange={(e) => setProgressForm({...progressForm, measurements: {...progressForm.measurements, arms: e.target.value}})} />
                  <input type="number" placeholder="Thighs" value={progressForm.measurements.thighs} onChange={(e) => setProgressForm({...progressForm, measurements: {...progressForm.measurements, thighs: e.target.value}})} />
                </div>
                <div className="form-group">
                  <label>Notes</label>
                  <textarea value={progressForm.notes} onChange={(e) => setProgressForm({...progressForm, notes: e.target.value})} rows="3"></textarea>
                </div>
                <button type="submit" className="btn-submit">Save Progress</button>
              </form>
            </div>

            <div className="progress-history">
              <h3>Progress History</h3>
              <div className="progress-chart">
                {/* Add chart component here using Chart.js or Recharts */}
                <div className="progress-list">
                  {progress.map(entry => (
                    <div key={entry._id} className="progress-entry">
                      <div className="entry-date">{new Date(entry.date).toLocaleDateString()}</div>
                      <div className="entry-stats">
                        <span>Weight: {entry.weight}kg</span>
                        {entry.bodyFat && <span>Body Fat: {entry.bodyFat}%</span>}
                        {entry.muscleMass && <span>Muscle: {entry.muscleMass}kg</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="chat-section">
            <div className="chat-sidebar">
              <h3>Coaches</h3>
              <div className="coach-list">
                <div className="coach-item" onClick={() => setSelectedCoach('coach1')}>
                  <div className="coach-avatar">JC</div>
                  <div className="coach-name">John Coach</div>
                </div>
                <div className="coach-item" onClick={() => setSelectedCoach('coach2')}>
                  <div className="coach-avatar">SS</div>
                  <div className="coach-name">Sarah Smith</div>
                </div>
              </div>
            </div>
            <div className="chat-area">
              {selectedCoach ? (
                <>
                  <div className="messages-container">
                    {messages.map(msg => (
                      <div key={msg._id} className={`message ${msg.from === user.id ? 'sent' : 'received'}`}>
                        <div className="message-content">{msg.message}</div>
                        <div className="message-time">{new Date(msg.createdAt).toLocaleTimeString()}</div>
                      </div>
                    ))}
                  </div>
                  <div className="message-input">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your message..."
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    />
                    <button onClick={handleSendMessage}>Send</button>
                  </div>
                </>
              ) : (
                <div className="no-coach-selected">Select a coach to start chatting</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MemberPortal;