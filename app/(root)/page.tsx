import HeaderBox from '@/components/HeaderBox';
import Rightsidebar from '@/components/RightSidebar';
import TotalBalanceBox from '@/components/TotalBalanceBox';
import { getLoggedInUser } from '@/lib/actions/user.actions';
import React from 'react';

const Home =  async () => {
  const loggedIn = await getLoggedInUser();
  return (
    <section className="home">
      <div className="home-content">
        <header className="home-header">
          <HeaderBox
            type="greeting"
            title="Welcome"
            user={loggedIn?.name ?? 'Guest'}
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
