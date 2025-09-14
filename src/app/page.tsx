'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import LoginForm from '@/components/LoginForm';
import RegistrationForm from '@/components/RegistrationForm';
import NotesDashboard from '@/components/NotesDashboard';

export default function Home() {
  const { user, loading } = useAuth();
  const [showRegistration, setShowRegistration] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <div className="text-lg text-gray-600">Loading...</div>
        </div>
      </div>
    );
  }

  if (user) {
    return <NotesDashboard />;
  }

  if (showRegistration) {
    return (
      <RegistrationForm
        onSwitchToLogin={() => setShowRegistration(false)}
        onSuccess={() => setShowRegistration(false)}
      />
    );
  }

  return (
    <LoginForm
      onSwitchToRegister={() => setShowRegistration(true)}
      onShowTenantCreation={() => setShowRegistration(true)}
    />
  );
}