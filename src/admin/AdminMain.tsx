import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AdminAuth } from './common/AdminAuth';
import { AdminHeader } from './common/AdminHeader';
import { ErrorBoundary } from './common/ErrorBoundary';
import { AdminGateway } from './gateway/AdminGateway';
import { PizzaDashboard } from './pizza/components/PizzaDashboard';
import { ResortDashboard } from './resort/components/ResortDashboard';
import DocumentReaderStudio from './components/DocumentReaderStudio';
import { PaymentsDashboard } from './payments/components/PaymentsDashboard';

export function AdminMain() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeDept, setActiveDept] = useState<'gateway' | 'pizza' | 'resort' | 'docs' | 'payments'>('gateway');

  // Sync active dept from URL query param if present (?dept=pizza, ?dept=resort, ?dept=docs, or ?dept=payments)
  useEffect(() => {
    const deptParam = searchParams.get('dept');
    if (deptParam === 'pizza' || deptParam === 'resort' || deptParam === 'docs' || deptParam === 'payments') {
      setActiveDept(deptParam);
    } else {
      setActiveDept('gateway');
    }
  }, [searchParams]);

  const handleSelectDept = (dept: 'gateway' | 'pizza' | 'resort' | 'docs' | 'payments') => {
    setActiveDept(dept);
    if (dept === 'gateway') {
      setSearchParams({});
    } else {
      setSearchParams({ dept });
    }
  };

  return (
    <AdminAuth>
      {(session, handleLogout) => (
        <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans">
          {/* Top Shared Admin Header */}
          <AdminHeader
            userEmail={session.user.email}
            activeDept={activeDept}
            onSelectDept={handleSelectDept}
            onLogout={handleLogout}
          />

          {/* Main Content Area - Full width responsive for all monitors and smartphones */}
          <main className="flex-1 px-2.5 sm:px-4 md:px-6 py-4 sm:py-6 w-full max-w-none">
            {activeDept === 'gateway' && (
              <AdminGateway onSelectDepartment={(dept) => handleSelectDept(dept)} />
            )}

            {activeDept === 'pizza' && (
              <ErrorBoundary moduleName="Pizzeria Ranong">
                <PizzaDashboard />
              </ErrorBoundary>
            )}

            {activeDept === 'resort' && (
              <ErrorBoundary moduleName="Resort Koh Phayam">
                <ResortDashboard />
              </ErrorBoundary>
            )}

            {activeDept === 'docs' && (
              <ErrorBoundary moduleName="Document Web Reader">
                <DocumentReaderStudio />
              </ErrorBoundary>
            )}

            {activeDept === 'payments' && (
              <ErrorBoundary moduleName="Centro Pagamenti & Multi-Gateway">
                <PaymentsDashboard />
              </ErrorBoundary>
            )}
          </main>
        </div>
      )}
    </AdminAuth>
  );
}

export default AdminMain;
