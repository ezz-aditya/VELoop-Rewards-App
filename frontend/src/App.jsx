
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './App.css';
import AuthPanel from './AuthPanel';
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
import veloopLogo from './assets/Animation-VELoop-xJgvrjNN.gif';

const API_URL = import.meta.env.VITE_API_URL;







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
  const [showCpaDemo, setShowCpaDemo] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerError, setRegisterError] = useState('');
  const [registerSuccess, setRegisterSuccess] = useState('');
  const [userName, setUserName] = useState('');

  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [claimed, setClaimed] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [streakStatus, setStreakStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimMessage, setClaimMessage] = useState('');
  const [countdown, setCountdown] = useState('');


  useEffect(() => {
    const nextClaimAt = streakStatus?.nextClaimAt;
    const serverTime = streakStatus?.serverTime;

    if (!nextClaimAt || !serverTime) {
      setCountdown('');
      return;
    }

    const nextClaimMs = new Date(nextClaimAt).getTime();
    const serverTimeMs = new Date(serverTime).getTime();
    const receivedAt = Date.now();

    const updateCountdown = () => {
      // Estimate current server time using the server timestamp
      // and elapsed time since the response was received.
      const estimatedServerNow = serverTimeMs + (Date.now() - receivedAt);
      const remainingMs = nextClaimMs - estimatedServerNow;
      console.log('TIMER VALUES:', {
        nextClaimAt,
        serverTime,
        nextClaimMs,
        serverTimeMs,
        remainingMs,
      });

      if (remainingMs <= 0) {
        setCountdown('00:00:00');
        return;
      }

      const totalSeconds = Math.ceil(remainingMs / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      setCountdown(
        `${String(hours).padStart(2, '0')}:` +
        `${String(minutes).padStart(2, '0')}:` +
        `${String(seconds).padStart(2, '0')}`
      );
    };

    updateCountdown();
    const intervalId = setInterval(updateCountdown, 1000);

    return () => clearInterval(intervalId);
  }, [streakStatus]);


  useEffect(() => {
    let cancelled = false;

    async function fetchRewards() {
      try {
        const response = await axios.get(`${API_URL}/daily-streak`);

        if (cancelled) return;

        const data = response.data;
        const rewardsData = Array.isArray(data)
          ? data
          : data.rewards || data.data || [];

        console.log('Daily streak API response:', data);
        console.log('Parsed rewards:', rewardsData);

        setRewards(
          rewardsData.map((reward) => ({
            ...reward,
            image: reward.image || rewardImages[reward.day] || vesCoin,
          }))
        );
      } catch (err) {
        console.error('Failed to fetch rewards:', err);
        if (!cancelled) {
          setError('Unable to load rewards. Please try again.');
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

  // Fetch wallet balance.
  const fetchWalletBalance = useCallback(
    async (authToken = token) => {
      if (!authToken) {
        setWalletBalance(0);
        return;
      }

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
    },
    [token]
  );

  // Fetch streak status and determine whether today's reward was claimed.
  const fetchStreakStatus = useCallback(
    async (authToken = token) => {
      if (!authToken) {
        setClaimed(false);
        setStreakStatus(null);
        setStatusLoading(false);
        return;
      }

      setStatusLoading(true);

      try {
        const response = await axios.get(
          `${API_URL}/daily-streak/status`,
          {
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
            params: {
              _refresh: Date.now(),
            },
          }
        );

        const status = response.data.status || response.data;
        console.log('FULL STREAK STATUS:', status);
        console.log('CLAIMS ARRAY:', status.claims);
        console.log(
          'CLAIMED DAYS:',
          (status.claims ?? []).map((claim) => claim.day)
        );

        setStreakStatus({
          ...status,
          serverTime: status.serverTime,
          nextClaimAt: status.nextClaimAt,
          cooldownComplete: status.cooldownComplete,
        });
        console.log('COUNTDOWN DEBUG:', {
          serverTime: status.serverTime,
          nextClaimAt: status.nextClaimAt,
          cooldownComplete: status.cooldownComplete,
        });

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

        if (err.response?.status === 401) {
          localStorage.removeItem('velop_token');
          setToken('');
          setClaimed(false);
          setStreakStatus(null);
          setClaimMessage('Session expired. Please log in again.');
        }
      } finally {
        setStatusLoading(false);
      }
    },
    [token]
  );

  // Login.
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
      const receivedName =
        response.data.user?.name ||
        response.data.name ||
        '';


      if (!receivedToken) {
        throw new Error('Login response did not contain a token.');
      }

      localStorage.setItem('velop_token', receivedToken);
      setToken(receivedToken);
      setUserName(receivedName);
      setPassword('');

      await Promise.all([
        fetchWalletBalance(receivedToken),
        fetchStreakStatus(receivedToken),
      ]);
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

  async function handleRegister(event) {
    event.preventDefault();
    setRegisterError('');
    setRegisterSuccess('');

    if (password.length < 8) {
      setRegisterError('Password must be at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setRegisterError('Passwords do not match.');
      return;
    }

    setRegisterLoading(true);

    try {
      const response = await axios.post(`${API_URL}/auth/register`, {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
      });

      if (response.data.success) {
        setRegisterSuccess('Account created! Please log in.');
        setIsRegister(false);
        setName('');
        setConfirmPassword('');
        setPassword('');
        setEmail(email.trim().toLowerCase());
        setRegisterError('');
      }
    } catch (err) {
      setRegisterError(
        err.response?.data?.message ||
        'Registration failed. Please try again.'
      );
    } finally {
      setRegisterLoading(false);
    }
  }


  async function processRewardClaim() {
    if (!token || claimLoading || statusLoading) return;

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
        setClaimMessage(
          response.data.message || 'Reward claimed successfully!'
        );

        setShowCpaDemo(false);

        await Promise.all([
          fetchWalletBalance(token),
          fetchStreakStatus(token),
        ]);
      }
    } catch (err) {
      const statusCode = err.response?.status;
      const message = err.response?.data?.message;

      setClaimMessage(
        message || 'Reward claim nahi hua. Please try again.'
      );

      if (statusCode === 409) {
        await Promise.all([
          fetchWalletBalance(token),
          fetchStreakStatus(token),
        ]);
      }
    } finally {
      setClaimLoading(false);
    }
  }

  // Open CPA demo before claiming today's reward.
  function handleClaim() {
    if (!token || claimLoading || statusLoading) return;

    setClaimMessage('');
    setShowCpaDemo(true);
  }



  function handleLogout() {
    localStorage.removeItem('velop_token');

    setToken('');
    setPassword('');
    setLoginError('');
    setClaimed(false);
    setStreakStatus(null);
    setWalletBalance(0);
    setClaimMessage('');
    setStatusLoading(false);
  }

  // Fetch streak status whenever the authentication token changes.
  useEffect(() => {
    let cancelled = false;

    async function loadStreakStatus() {
      if (!token) {
        setClaimed(false);
        setStreakStatus(null);
        setStatusLoading(false);
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
            params: {
              _refresh: Date.now(),
            },
          }
        );

        if (cancelled) return;

        const status = response.data.status || response.data;
        setStreakStatus(status);

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
        if (cancelled) return;

        console.error('Failed to fetch streak status:', err);

        if (err.response?.status === 401) {
          localStorage.removeItem('velop_token');
          setToken('');
          setClaimed(false);
          setStreakStatus(null);
        }
      } finally {
        if (!cancelled) {
          setStatusLoading(false);
        }
      }
    }

    loadStreakStatus();

    return () => {
      cancelled = true;
    };
  }, [token]);

  // Fetch wallet balance whenever the token changes.
  useEffect(() => {
    let cancelled = false;

    async function loadWalletBalance() {
      if (!token) {
        setWalletBalance(0);
        return;
      }

      try {
        const response = await axios.get(`${API_URL}/wallet`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!cancelled) {
          setWalletBalance(response.data.balance ?? 0);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to fetch wallet balance:', err);
        }
      }
    }

    loadWalletBalance();

    return () => {
      cancelled = true;
    };
  }, [token]);


  useEffect(() => {
    setLoading(false);
  }, []);

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
        <AuthPanel
          isRegister={isRegister}
          name={name}
          setName={setName}
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          confirmPassword={confirmPassword}
          setConfirmPassword={setConfirmPassword}
          onSubmit={isRegister ? handleRegister : handleLogin}
          loading={isRegister ? registerLoading : loginLoading}
          error={isRegister ? registerError : loginError}
          success={registerSuccess}
          onToggle={() => {
            setIsRegister((current) => !current);
            setLoginError('');
            setRegisterError('');
            setRegisterSuccess('');
            setPassword('');
            setConfirmPassword('');
          }}
        />
      )}

      {token && (
        <>
          <nav className="topbar">
            <a className="brand" href="#home">
              <img
                src={veloopLogo}
                alt="VELoop Logo"
                className="brand-logo"
              />
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

              <div className="avatar">
                {userName.trim().charAt(0).toUpperCase() || 'U'}
              </div>

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
                      {streakStatus?.currentDay ?? 0} Days
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
                    {(() => {
                      const nextReward = rewards.find(
                        (reward) =>
                          Number(reward.day) ===
                          Number(streakStatus?.currentDay ?? 0) + 1
                      );

                      if (!nextReward) return 'Cycle Complete';

                      const amount =
                        nextReward.amount ?? nextReward.rewardAmount ?? '';

                      const type =
                        nextReward.type ?? nextReward.rewardType ?? 'VES';

                      if (
                        String(type).toUpperCase().includes('GIFT') ||
                        String(nextReward.provider ?? '').toLowerCase().includes('amazon')
                      ) {
                        return `₹${amount} Amazon Gift Card`;
                      }

                      return `${amount} VES`;
                    })()}
                  </strong>

                  {countdown && (
                    <small
                      style={{
                        display: 'block',
                        marginTop: '6px',
                        color: '#f5c85b',
                      }}
                    >
                      Unlocks in {countdown}
                    </small>
                  )}




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
                  {streakStatus?.claims?.length ?? 0} / 7 DAYS
                </span>
              </div>

              <div className="rewards-grid">
                {rewards.map((reward) => {

                  const currentDay = Number(streakStatus?.currentDay ?? 0);

                  const claimedDays = new Set(
                    (streakStatus?.claims ?? []).map(
                      (claim) => Number(claim.day)
                    )
                  );

                  const isClaimed = claimedDays.has(Number(reward.day));
                  const isToday =
                    Number(reward.day) === currentDay + 1 &&
                    streakStatus?.canClaimToday === true;



                  return (
                    <article
                      className={`reward-card ${isToday ? 'is-today' : ''
                        } ${isClaimed ? 'is-claimed' : ''}`}
                      key={reward.day}
                    >
                      <div className="day-label">
                        <span>DAY {reward.day}</span>

                        {isClaimed && (
                          <span className="mini-check">✓</span>
                        )}

                        {isToday && (
                          <span className="today-tag">TODAY</span>
                        )}
                      </div>

                      <div className="reward-art">
                        <img
                          src={
                            reward.image ||
                            rewardImages[reward.day] ||
                            vesCoin
                          }
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
                        className={`reward-button ${isToday && streakStatus?.canClaimToday && !isClaimed
                          ? 'claim-button'
                          : ''
                          }`}
                        disabled={
                          !isToday ||
                          !streakStatus?.canClaimToday ||
                          claimLoading ||
                          statusLoading ||
                          isClaimed
                        }
                        onClick={handleClaim}
                      >
                        {isClaimed
                          ? '✓ Claimed'
                          : claimLoading
                            ? 'Claiming...'
                            : isToday && streakStatus?.canClaimToday
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

          {/* CPA Demo Modal */}
          {showCpaDemo && (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.75)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 9999,
                padding: '20px',
              }}
            >
              <div
                style={{
                  width: '100%',
                  maxWidth: '420px',
                  background: '#171923',
                  border: '1px solid #343849',
                  borderRadius: '18px',
                  padding: '28px',
                  color: '#fff',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '38px', marginBottom: '12px' }}>
                  🎁
                </div>

                <h2 style={{ marginBottom: '10px' }}>
                  Reward Verification
                </h2>

                <p style={{ color: '#b8bdcc', lineHeight: 1.6 }}>
                  Complete this demo verification step to continue with your
                  daily streak reward claim.
                </p>

                <div
                  style={{
                    background: '#222637',
                    borderRadius: '10px',
                    padding: '12px',
                    margin: '18px 0',
                    color: '#f5c85b',
                    fontSize: '13px',
                  }}
                >
                  Demo only — no real advertisement or CPA network is connected.
                </div>

                <button
                  onClick={processRewardClaim}
                  disabled={claimLoading}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: 'none',
                    borderRadius: '10px',
                    background: '#f5c85b',
                    color: '#171923',
                    fontWeight: 'bold',
                    cursor: claimLoading ? 'not-allowed' : 'pointer',
                    opacity: claimLoading ? 0.6 : 1,
                  }}
                >
                  {claimLoading ? 'Verifying...' : 'Continue Demo Verification'}
                </button>

                <button
                  onClick={() => setShowCpaDemo(false)}
                  disabled={claimLoading}
                  style={{
                    width: '100%',
                    marginTop: '10px',
                    padding: '11px',
                    border: '1px solid #45495b',
                    borderRadius: '10px',
                    background: 'transparent',
                    color: '#fff',
                    cursor: claimLoading ? 'not-allowed' : 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

        </>
      )}
    </div>
  );
}


export default App;