import { useEffect, useState } from 'react';
import { DataProvider, useData } from './context/DataContext';
import { useTelegramTheme } from './hooks/useTelegramTheme';
import { initTelegramApp } from './telegram/webapp';
import { TabBar, type Tab } from './components/ui/TabBar';
import { OnboardingGuide } from './components/OnboardingGuide';
import { HomeScreen } from './screens/HomeScreen';
import { AccountsScreen } from './screens/AccountsScreen';
import { ExpensesScreen } from './screens/ExpensesScreen';
import { AnalyticsScreen } from './screens/AnalyticsScreen';
import { SettingsScreen } from './screens/SettingsScreen';

// Флаг «инструкция показана» держим только в localStorage конкретного
// устройства (не синхронизируем через облако) — это UI-состояние, а не данные
// пользователя.
const ONBOARDING_SEEN_KEY = 'onboarding_seen';

function Screens({
  tab,
  onNavigate,
  onOpenAccount,
  pendingAdjustAccountId,
  onConsumeInitialAdjust,
  onOpenGuide,
}: {
  tab: Tab;
  onNavigate: (tab: Tab) => void;
  onOpenAccount: (accountId: string) => void;
  pendingAdjustAccountId: string | null;
  onConsumeInitialAdjust: () => void;
  onOpenGuide: () => void;
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
      return <SettingsScreen onOpenGuide={onOpenGuide} />;
  }
}

function AppShell() {
  const [tab, setTab] = useState<Tab>('home');
  const [pendingAdjustAccountId, setPendingAdjustAccountId] = useState<string | null>(
    null,
  );
  const [guideOpen, setGuideOpen] = useState(false);
  const { settings } = useData();
  useTelegramTheme(settings.accentColor);

  useEffect(() => {
    initTelegramApp();
  }, []);

  useEffect(() => {
    if (!localStorage.getItem(ONBOARDING_SEEN_KEY)) {
      setGuideOpen(true);
    }
  }, []);

  const closeGuide = () => {
    localStorage.setItem(ONBOARDING_SEEN_KEY, '1');
    setGuideOpen(false);
  };

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
        onOpenGuide={() => setGuideOpen(true)}
      />
      <TabBar active={tab} onChange={setTab} />
      {guideOpen && <OnboardingGuide onClose={closeGuide} />}
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
