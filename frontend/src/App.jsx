
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

const API_URL = 'http://localhost:5000/api';

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
  const [token, setToken] = useState(
    () => localStorage.getItem('velop_token') || ''
  );

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [claimed, setClaimed] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [streakStatus, setStreakStatus] = useState(null);
const [statusLoading, setStatusLoading] = useState(false);
  const [claimLoading, setClaimLoading] = useState(false);
const [claimMessage, setClaimMessage] = useState('');

  
async function handleClaim() {
  if (!token || claimLoading || claimed) return;

  setClaimLoading(true);
  setClaimMessage('');

  try {
    const response = await axios.post(
      `${API_URL}/daily-streak/claim`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (response.data.success) {
      setClaimed(true);
      setClaimMessage(
        response.data.message || 'Reward claimed successfully!'
      );
    }
  } catch (err) {
    if (err.response?.status === 401) {
      setClaimMessage('Session expired. Please log in again.');
    } else {
      setClaimMessage(
        err.response?.data?.message ||
          'Reward claim nahi hua. Please try again.'
      );
    }
  } finally {
    setClaimLoading(false);
  }
}
  
  async function handleLogin(event) {
    event.preventDefault();
    setLoginLoading(true);
    setLoginError('');

    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email,
        password,
      });

      const receivedToken = response.data.token;

      if (!receivedToken) {
        throw new Error('Login response did not contain a token.');
      }

      localStorage.setItem('velop_token', receivedToken);
      setToken(receivedToken);
      await fetchWalletBalance(receivedToken);
      setPassword('');
    } catch (err) {
      setLoginError(
        err.response?.data?.message ||
          err.message ||
          'Login failed. Please try again.'
      );
    } finally {
      setLoginLoading(false);
    }
  }
  
async function fetchWalletBalance(authToken = token) {
  try {
    const response = await axios.get(`${API_URL}/wallet`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    setWalletBalance(response.data.balance ?? 0);
  } catch (err) {
    console.error('Failed to fetch wallet balance:', err);
  }
}

  function handleLogout() {
    localStorage.removeItem('velop_token');
    setToken('');
    setPassword('');
    setLoginError('');
    setClaimed(false);
  }

  useEffect(() => {
    let cancelled = false;

    async function fetchRewards() {
      setLoading(true);
      setError('');

      try {
        const response = await axios.get(
          `${API_URL}/daily-streak`
        );

        const apiRewards = (response.data.rewards || []).map(
          (reward) => ({
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
          })
        );

        if (!cancelled) {
          setRewards(apiRewards);
        }
      } catch (err) {
        console.error('Failed to fetch rewards:', err);

        if (!cancelled) {
          setError(
            'Rewards load nahi ho paaye. Please check your backend.'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchRewards();

    return () => {
      cancelled = true;
    };
  }, []);

useEffect(() => {
  if (token) {
    fetchWalletBalance(token);
  } else {
    setWalletBalance(0);
  }
}, [token]);

  
useEffect(() => {
  let cancelled = false;

  async function fetchStreakStatus() {
    if (!token) {
      setClaimed(false);
      setStreakStatus(null);
      return;
    }

    setStatusLoading(true);

    try {
      const response = await axios.get(
        `${API_URL}/daily-streak/status`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const status = response.data.status || response.data;

      if (cancelled) return;

      setStreakStatus(status);

      // Compare the last claim date using India time.
      const lastClaimDate = status.lastClaimDate
        ? new Date(status.lastClaimDate)
        : null;

      const dateKey = (date) =>
        new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Asia/Kolkata',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).format(date);

      const claimedToday =
        lastClaimDate &&
        !Number.isNaN(lastClaimDate.getTime()) &&
        dateKey(lastClaimDate) === dateKey(new Date());

      setClaimed(Boolean(claimedToday));
    } catch (err) {
      console.error('Failed to fetch streak status:', err);

      if (!cancelled && err.response?.status === 401) {
        localStorage.removeItem('velop_token');
        setToken('');
      }
    } finally {
      if (!cancelled) {
        setStatusLoading(false);
      }
    }
  }

  fetchStreakStatus();

  return () => {
    cancelled = true;
  };
}, [token]);

  if (loading) {
    return (
      <div className="streak-app">
        <p>Loading VELoop rewards...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="streak-app">
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="streak-app">
      {!token && (
        <div className="login-panel">
          <h2>Login to VELoop Rewards</h2>
          <p>Login to access your daily streak and rewards.</p>

          <form onSubmit={handleLogin}>
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />

            <button type="submit" disabled={loginLoading}>
              {loginLoading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          {loginError && (
            <p className="login-error" role="alert">
              {loginError}
            </p>
          )}
        </div>
      )}

      {token && (
        <>
          <nav className="topbar">
            <a className="brand" href="#home">
              <span className="brand-icon">V</span>
              VELoop <span className="brand-light">Rewards</span>
            </a>

            <div className="nav-right">
              <span className="balance">
                <img
                  src={vesCoin}
                  alt=""
                  className="balance-coin"
                />
               {walletBalance} VEs
              </span>

              <div className="avatar">A</div>

              <button
                type="button"
                onClick={handleLogout}
                className="logout-button"
              >
                Logout
              </button>
            </div>
          </nav>

          <main className="main-content">
            <div className="breadcrumb">
              Home / Rewards / Daily Streak
            </div>

            <section className="hero">
              <img
                src={topLeft}
                alt=""
                className="hero-decoration hero-decoration-left"
              />

              <div className="hero-copy">
                <span className="eyebrow">
                  YOUR DAILY REWARD JOURNEY
                </span>

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
                    <strong>
                      <img
                        src={flame}
                        alt=""
                        className="inline-icon"
                      />{' '}
                      1 Day
                    </strong>
                    <span>Current Streak</span>
                  </div>

                  <div>
                    <strong>7 Days</strong>
                    <span>Reward Journey</span>
                  </div>
                </div>
              </div>

              <div className="hero-art">
                <img
                  src={topRight}
                  alt=""
                  className="hero-decoration hero-decoration-right"
                />

                <picture className="hero-art-picture">
                  <source
                    media="(max-width: 700px)"
                    srcSet={mobileHero}
                  />
                  <img
                    src={exclusiveReward}
                    alt="Exclusive VELoop reward"
                    className="hero-main-image"
                  />
                </picture>

                <span className="hero-art-label">
                  YOUR NEXT REWARD AWAITS
                </span>
              </div>
            </section>

            <section className="stats-grid">
              <div className="stat-card">
                <span className="stat-icon">7</span>
                <div>
                  <span>Total Rewards</span>
                  <strong>7</strong>
                </div>
              </div>

              <div className="stat-card">
                <span className="stat-icon">
                  <img
                    src={flame}
                    alt=""
                    className="stat-image"
                  />
                </span>
                <div>
                  <span>Checked In</span>
                  <strong>{streakStatus?.currentDay ?? 0}</strong>
                </div>
              </div>

              <div className="stat-card">
                <span className="stat-icon">
                  <img
                    src={vesCoin}
                    alt=""
                    className="stat-image"
                  />
                </span>
                <div>
                  <span>Next Reward</span>
                  <strong>
                    {rewards.find((reward) => reward.day === 2)
                      ?.amount || '+10'}
                    {' '}
                    {rewards.find((reward) => reward.day === 2)
                      ?.type || 'VEs'}
                  </strong>
                </div>
              </div>
            </section>

            <section className="rewards-section">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">
                    KEEP THE MOMENTUM
                  </span>
                  <h2>Your 7-Day Streak</h2>
                  <p>
                    Check in daily to unlock the next reward.
                  </p>
                </div>

                <span className="progress-pill">
                  {streakStatus?.currentDay ?? 0} / 7 DAYS
                </span>
              </div>

              <div className="rewards-grid">
  {rewards.map((reward) => {
                  
const currentDay = streakStatus?.currentDay ?? 0;
const isClaimed = reward.day <= currentDay;
const isToday = reward.day === currentDay + 1;


                  return (
                    <article
                      className={`reward-card ${
                        isToday ? 'is-today' : ''
                      } ${isClaimed ? 'is-claimed' : ''}`}
                      key={reward.day}
                    >
                      <div className="day-label">
                        <span>DAY {reward.day}</span>

                        {isClaimed && (
                          <span className="mini-check">✓</span>
                        )}

                        {isToday && (
                          <span className="today-tag">
                            TODAY
                          </span>
                        )}
                      </div>

                      <div className="reward-art">
                        <img
                          src={reward.image}
                          alt={`Day ${reward.day} reward`}
                          className="reward-image"
                          loading="lazy"
                        />
                      </div>

                      <strong className="reward-amount">
                        {reward.amount}
                      </strong>

                      <span className="reward-type">
                        {reward.type}
                      </span>

                      <button
  className={`reward-button ${isToday ? 'claim-button' : ''}`}
 disabled={!isToday || claimLoading || statusLoading}
  onClick={handleClaim}
>
  {claimLoading
    ? 'Claiming...'
    : isClaimed
      ? '✓ Claimed'
      : isToday
        ? 'Claim Reward'
        : '🔒 Locked'}
</button>
                    </article>
                  );
                })}
              </div>
                {claimMessage && (
  <p role="status" className="claim-message">
    {claimMessage}
  </p>
)}
              <p className="demo-note">
                Reward claims are still in demo mode. Backend
                integration for claim status and wallet balance
                is the next step.
              </p>
            </section>

            <section className="why-section">
              <img
                src={biggerStreak}
                alt="Build a bigger streak"
                className="why-image"
              />

              <div>
                <h3>Why Maintain Your Streak?</h3>
                <p>
                  Every day counts! Keep coming back to unlock
                  bigger rewards. Miss a day and you may have
                  to start your streak again.
                </p>
              </div>

              <img
                src={stayActive}
                alt=""
                className="why-side-image"
                loading="lazy"
              />
            </section>

            <section className="trust-section">
              <img
                src={trust}
                alt=""
                className="trust-image"
              />
              <span>
                Rewards designed for your daily consistency.
              </span>
            </section>

            <footer className="footer">
              <span>© 2026 VELoop Rewards</span>
              <span>Daily consistency. Bigger rewards.</span>
            </footer>
          </main>
        </>
      )}
    </div>
  );
}

export default App;
