import HeaderBox from '@/components/HeaderBox';
import Rightsidebar from '@/components/RightSidebar';
import TotalBalanceBox from '@/components/TotalBalanceBox';
import React from 'react';

const Home = () => {
  const loggedIn = { firstName: 'Siri', lastName: 'Tech', email: 'siritech@gmail.com' };
  return (
    <section className="home">
      <div className="home-content">
        <header className="home-header">
          <HeaderBox
            type="greeting"
            title="Welcome"
            user={loggedIn?.firstName || 'Guest'}
            subtext="Access and manage your account and transactions efficiently."
          />

          <TotalBalanceBox
            accounts={[]}
            totalBanks={1}
            totalCurrentBalance={1500.25}
          />
        </header>

        RECENT TRANSACTIONS
      </div>

      <Rightsidebar 
        user={loggedIn}
        transactions={[]}
        banks={[{ currentBalance: 140.50 }, {currentBalance: 500.50}]}
      />
    </section>
  );
};

export default Home;
