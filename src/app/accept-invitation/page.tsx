'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function AcceptInvitationPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [invitationData, setInvitationData] = useState<any>(null);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    useEffect(() => {
        if (!token) {
            setError('Invalid invitation link');
            setLoading(false);
            return;
        }

        // Verify the invitation token
        verifyInvitation();
    }, [token]);

    const verifyInvitation = async () => {
        try {
            const response = await fetch(`/api/auth/verify-invitation?token=${token}`);
            const data = await response.json();

            if (response.ok) {
                setInvitationData(data.invitation);
                setSuccess('Invitation verified! Please set your password to complete the process.');
            } else {
                setError(data.error || 'Invalid or expired invitation');
            }
        } catch (error) {
            setError('Failed to verify invitation');
        } finally {
            setLoading(false);
        }
    };

    const handleAcceptInvitation = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            setSubmitting(false);
            return;
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters long');
            setSubmitting(false);
            return;
        }

        try {
            const response = await fetch('/api/auth/accept-invitation', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    token,
                    password
                })
            });

            const data = await response.json();

            if (response.ok) {
                setSuccess('Welcome! You have successfully joined the organization. Redirecting...');
                // Store token and redirect
                localStorage.setItem('token', data.token);
                setTimeout(() => {
                    router.push('/');
                }, 2000);
            } else {
                setError(data.error || 'Failed to accept invitation');
            }
        } catch (error) {
            setError('Failed to accept invitation');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                    <div className="text-lg text-gray-600">Verifying invitation...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center">
                    <div className="mx-auto h-16 w-16 bg-green-600 rounded-full flex items-center justify-center mb-4">
                        <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">
                        {invitationData ? 'Complete Your Registration' : 'Invalid Invitation'}
                    </h2>
                    <p className="text-gray-600">
                        {invitationData
                            ? `You've been invited to join ${invitationData.companyName}`
                            : 'This invitation link is invalid or has expired'
                        }
                    </p>
                </div>

                {invitationData && (
                    <div className="bg-white py-8 px-6 shadow-xl rounded-2xl border border-gray-100">
                        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                            <h3 className="text-lg font-semibold text-blue-900 mb-2">Invitation Details</h3>
                            <div className="space-y-1 text-sm text-blue-800">
                                <p><strong>Name:</strong> {invitationData.firstName} {invitationData.lastName}</p>
                                <p><strong>Email:</strong> {invitationData.email}</p>
                                <p><strong>Role:</strong> {invitationData.role}</p>
                                <p><strong>Organization:</strong> {invitationData.companyName}</p>
                            </div>
                        </div>

                        {success && (
                            <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                                {success}
                            </div>
                        )}

                        {error && (
                            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                                {error}
                            </div>
                        )}

                        <form className="space-y-6" onSubmit={handleAcceptInvitation}>
                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                                    Password
                                </label>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 placeholder-gray-500"
                                    placeholder="Enter your password"
                                />
                            </div>

                            <div>
                                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                                    Confirm Password
                                </label>
                                <input
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    type="password"
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 placeholder-gray-500"
                                    placeholder="Confirm your password"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {submitting ? 'Accepting Invitation...' : 'Accept Invitation & Join Organization'}
                            </button>
                        </form>
                    </div>
                )}

                {!invitationData && (
                    <div className="bg-white py-8 px-6 shadow-xl rounded-2xl border border-gray-100 text-center">
                        <div className="text-red-600 mb-4">
                            <svg className="h-12 w-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <h3 className="text-lg font-semibold mb-2">Invalid Invitation</h3>
                            <p className="text-gray-600 mb-4">
                                This invitation link is invalid, expired, or has already been used.
                            </p>
                            <button
                                onClick={() => router.push('/')}
                                className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                            >
                                Go to Homepage
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
