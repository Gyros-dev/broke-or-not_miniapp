import { useEffect, useState } from 'react';
import { DataProvider, useData } from './context/DataContext';
import { useTelegramTheme } from './hooks/useTelegramTheme';
import { initTelegramApp } from './telegram/webapp';
import { TabBar, type Tab } from './components/ui/TabBar';
import { HomeScreen } from './screens/HomeScreen';
import { AccountsScreen } from './screens/AccountsScreen';
import { ExpensesScreen } from './screens/ExpensesScreen';
import { AnalyticsScreen } from './screens/AnalyticsScreen';
import { SettingsScreen } from './screens/SettingsScreen';

function Screens({
  tab,
  onNavigate,
  onOpenAccount,
  pendingAdjustAccountId,
  onConsumeInitialAdjust,
}: {
  tab: Tab;
  onNavigate: (tab: Tab) => void;
  onOpenAccount: (accountId: string) => void;
  pendingAdjustAccountId: string | null;
  onConsumeInitialAdjust: () => void;
}) {
  switch (tab) {
    case 'home':
      return (
        <HomeScreen
          onGoToAccounts={() => onNavigate('accounts')}
          onOpenAccount={onOpenAccount}
        />
      );
    case 'accounts':
      return (
        <AccountsScreen
          initialAdjustAccountId={pendingAdjustAccountId}
          onConsumeInitialAdjust={onConsumeInitialAdjust}
        />
      );
    case 'expenses':
      return <ExpensesScreen />;
    case 'analytics':
      return <AnalyticsScreen />;
    case 'settings':
      return <SettingsScreen />;
  }
}

function AppShell() {
  const [tab, setTab] = useState<Tab>('home');
  const [pendingAdjustAccountId, setPendingAdjustAccountId] = useState<string | null>(
    null,
  );
  const { settings } = useData();
  useTelegramTheme(settings.accentColor);

  useEffect(() => {
    initTelegramApp();
  }, []);

  return (
    <div className="min-h-[100dvh] bg-[var(--tg-bg)] pb-[calc(64px+env(safe-area-inset-bottom))] pt-[env(safe-area-inset-top)]">
      <Screens
        tab={tab}
        onNavigate={setTab}
        onOpenAccount={(accountId) => {
          setPendingAdjustAccountId(accountId);
          setTab('accounts');
        }}
        pendingAdjustAccountId={pendingAdjustAccountId}
        onConsumeInitialAdjust={() => setPendingAdjustAccountId(null)}
      />
      <TabBar active={tab} onChange={setTab} />
    </div>
  );
}

export default function App() {
  return (
    <DataProvider>
      <AppShell />
    </DataProvider>
  );
}
