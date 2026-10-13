import { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

import biggerStreak from './assets/Bigger_Streak.png';
import day4Reward from './assets/Day-4.png';
import day5Reward from './assets/Day-5.png';
import day7Reward from './assets/Day-7.png';
import exclusiveReward from './assets/Exclusive-reward.png';
import flame from './assets/Flame.png';
import mobileHero from './assets/Mobile_Hero.png';
import stayActive from './assets/Stay_Active.png';
import topRight from './assets/Top_right.png';
import topLeft from './assets/Top_Left.png';
import trust from './assets/Trust.png';
import vesCoin from './assets/VEs_Coin.png';


const rewardImages = {
  1: vesCoin,
  2: vesCoin,
  3: vesCoin,
  4: day4Reward,
  5: day5Reward,
  6: vesCoin,
  7: day7Reward,
};


function App() {
  const [claimed, setClaimed] = useState(false);
  
const [rewards, setRewards] = useState([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState('');

useEffect(() => {
  async function fetchRewards() {
    try {
      const response = await axios.get(
        'http://localhost:5000/api/daily-streak'
      );

      const apiRewards = response.data.rewards.map((reward) => ({
        day: reward.day,
        amount:
          reward.rewardType === 'VES'
            ? `+${reward.amount}`
            : `₹${reward.amount}`,
        type:
          reward.rewardType === 'VES'
            ? 'VEs'
            : `${reward.provider || 'Amazon'} Gift Card`,
        image: rewardImages[reward.day],
      }));

      setRewards(apiRewards);
    } catch (err) {
      console.error('Failed to fetch rewards:', err.message);
      setError('Rewards load nahi ho paaye. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  fetchRewards();
}, []);
if (loading) {
  return <div className="streak-app">Loading rewards...</div>;
}

if (error) {
  return <div className="streak-app">{error}</div>;
}

  return (
    
    <div className="streak-app">
      <nav className="topbar">
        <a className="brand" href="#home">
          <span className="brand-icon">V</span>
          VELoop <span className="brand-light">Rewards</span>
        </a>

        <div className="nav-right">
          <span className="balance">
            <img src={vesCoin} alt="" className="balance-coin" />
            120 VEs
          </span>
          <div className="avatar">A</div>
        </div>
      </nav>

      <main className="main-content">
        <div className="breadcrumb">Home / Rewards / Daily Streak</div>

        <section className="hero">
          <img src={topLeft} alt="" className="hero-decoration hero-decoration-left" />

          <div className="hero-copy">
            <span className="eyebrow">YOUR DAILY REWARD JOURNEY</span>
            <h1>
              Login Daily &amp; Earn
              <br />
              <span>Bigger Rewards!</span>
            </h1>
            <p>
              Stay consistent, build your streak, and unlock
              exciting rewards every day.
            </p>

            <div className="hero-stats">
              <div>
                <strong><img src={flame} alt="" className="inline-icon" /> 1 Day</strong>
                <span>Current Streak</span>
              </div>
              <div>
                <strong>7 Days</strong>
                <span>Reward Journey</span>
              </div>
            </div>
          </div>

          <div className="hero-art">
            <img src={topRight} alt="" className="hero-decoration hero-decoration-right" />
            <picture className="hero-art-picture">
              <source media="(max-width: 700px)" srcSet={mobileHero} />
              <img
                src={exclusiveReward}
                alt="Exclusive VELoop reward"
                className="hero-main-image"
              />
            </picture>
            <span className="hero-art-label">YOUR NEXT REWARD AWAITS</span>
          </div>
        </section>

        <section className="stats-grid">
          <div className="stat-card">
            <span className="stat-icon">7</span>
            <div><span>Total Rewards</span><strong>7</strong></div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">
              <img src={flame} alt="" className="stat-image" />
            </span>
            <div><span>Checked In</span><strong>{claimed ? 1 : 0}</strong></div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">
              <img src={vesCoin} alt="" className="stat-image" />
            </span>
            <div><span>Next Reward</span><strong>+10 VEs</strong></div>
          </div>
        </section>

        <section className="rewards-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">KEEP THE MOMENTUM</span>
              <h2>Your 7-Day Streak</h2>
              <p>Check in daily to unlock the next reward.</p>
            </div>
            <span className="progress-pill">{claimed ? '1' : '0'} / 7 DAYS</span>
          </div>

          <div className="rewards-grid">
            {rewards.map((reward) => {
              const isClaimed = claimed && reward.day === 1;
              const isToday = !claimed && reward.day === 1;

              return (
                <article
                  className={`reward-card ${isToday ? 'is-today' : ''} ${isClaimed ? 'is-claimed' : ''}`}
                  key={reward.day}
                >
                  <div className="day-label">
                    <span>DAY {reward.day}</span>
                    {isClaimed && <span className="mini-check">✓</span>}
                    {isToday && <span className="today-tag">TODAY</span>}
                  </div>

                  <div className="reward-art">
                    <img
                      src={reward.image}
                      alt={`Day ${reward.day} reward`}
                      className="reward-image"
                      loading="lazy"
                    />
                  </div>

                  <strong className="reward-amount">{reward.amount}</strong>
                  <span className="reward-type">{reward.type}</span>

                  <button
                    className={`reward-button ${isToday ? 'claim-button' : ''}`}
                    disabled={!isToday || claimed}
                    onClick={() => setClaimed(true)}
                  >
                    {isClaimed ? '✓ Claimed' : isToday ? 'Claim Reward' : '🔒 Locked'}
                  </button>
                </article>
              );
            })}
          </div>

          <p className="demo-note">
            UI preview only — claim state is temporary. Real rewards,
            eligibility and streak validation will be handled by the backend.
          </p>
        </section>

        <section className="why-section">
          <img src={biggerStreak} alt="Build a bigger streak" className="why-image" />
          <div>
            <h3>Why Maintain Your Streak?</h3>
            <p>
              Every day counts! Keep coming back to unlock bigger rewards.
              Miss a day and you may have to start your streak again.
            </p>
          </div>
          <img src={stayActive} alt="" className="why-side-image" loading="lazy" />
        </section>

        <section className="trust-section">
          <img src={trust} alt="" className="trust-image" />
          <span>Rewards designed for your daily consistency.</span>
        </section>

        <footer className="footer">
          <span>© 2026 VELoop Rewards</span>
          <span>Daily consistency. Bigger rewards.</span>
        </footer>
      </main>
    </div>
  );
}

export default App;
