'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface RegistrationFormProps {
    onSuccess?: () => void;
    onSwitchToLogin?: () => void;
}

export default function RegistrationForm({ onSuccess, onSwitchToLogin }: RegistrationFormProps) {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: '',
        tenantSlug: '',
        companyName: '',
        themeColor: '#3B82F6'
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isCreatingTenant, setIsCreatingTenant] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        // Validation
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (formData.password.length < 8) {
            setError('Password must be at least 8 characters long');
            return;
        }

        setLoading(true);

        try {
            let response;

            if (isCreatingTenant) {
                // Create new tenant
                response = await fetch('/api/tenants', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        companyName: formData.companyName,
                        adminEmail: formData.email,
                        adminPassword: formData.password,
                        adminFirstName: formData.firstName,
                        adminLastName: formData.lastName,
                        themeColor: formData.themeColor
                    })
                });
            } else {
                // Join existing tenant
                response = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        firstName: formData.firstName,
                        lastName: formData.lastName,
                        email: formData.email,
                        password: formData.password,
                        tenantSlug: formData.tenantSlug
                    })
                });
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Registration failed');
            }

            if (isCreatingTenant) {
                setSuccess('Company created successfully! You are now logged in.');
                // Store token and refresh
                localStorage.setItem('token', data.token);
                window.location.reload();
            } else {
                setSuccess('Registration successful! Please check your email for verification.');
            }

            setFormData({
                firstName: '',
                lastName: '',
                email: '',
                password: '',
                confirmPassword: '',
                tenantSlug: '',
                companyName: '',
                themeColor: '#3B82F6'
            });

            if (onSuccess && !isCreatingTenant) {
                onSuccess();
            }

        } catch (error: any) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div>
                    <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-indigo-100">
                        <svg className="h-6 w-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                    </div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        {isCreatingTenant ? 'Create New Company' : 'Create your account'}
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        {isCreatingTenant ? 'Set up your company workspace' : 'Join your organization\'s workspace'}
                    </p>

                    {/* Toggle between modes */}
                    <div className="mt-4 flex rounded-lg bg-gray-100 p-1">
                        <button
                            type="button"
                            onClick={() => setIsCreatingTenant(false)}
                            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${!isCreatingTenant
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            Join Existing
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsCreatingTenant(true)}
                            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${isCreatingTenant
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            Create New Company
                        </button>
                    </div>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                                    First Name
                                </label>
                                <input
                                    id="firstName"
                                    name="firstName"
                                    type="text"
                                    required
                                    value={formData.firstName}
                                    onChange={handleChange}
                                    className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                                    placeholder="Enter your first name"
                                />
                            </div>
                            <div>
                                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                                    Last Name
                                </label>
                                <input
                                    id="lastName"
                                    name="lastName"
                                    type="text"
                                    required
                                    value={formData.lastName}
                                    onChange={handleChange}
                                    className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                                    placeholder="Enter your last name"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                                Email Address
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                value={formData.email}
                                onChange={handleChange}
                                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                                placeholder="Enter your email address"
                            />
                        </div>

                        {!isCreatingTenant ? (
                            <div>
                                <label htmlFor="tenantSlug" className="block text-sm font-medium text-gray-700">
                                    Organization Slug
                                </label>
                                <input
                                    id="tenantSlug"
                                    name="tenantSlug"
                                    type="text"
                                    required
                                    value={formData.tenantSlug}
                                    onChange={handleChange}
                                    className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                                    placeholder="Enter organization slug"
                                />
                                <p className="mt-1 text-xs text-gray-500">
                                    Ask your admin for the organization slug
                                </p>
                            </div>
                        ) : (
                            <>
                                <div>
                                    <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">
                                        Company Name
                                    </label>
                                    <input
                                        id="companyName"
                                        name="companyName"
                                        type="text"
                                        required
                                        value={formData.companyName}
                                        onChange={handleChange}
                                        className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                                        placeholder="Enter your company name"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="themeColor" className="block text-sm font-medium text-gray-700">
                                        Theme Color
                                    </label>
                                    <div className="flex items-center space-x-2">
                                        <input
                                            id="themeColor"
                                            name="themeColor"
                                            type="color"
                                            value={formData.themeColor}
                                            onChange={handleChange}
                                            className="h-10 w-16 border border-gray-300 rounded-md"
                                        />
                                        <span className="text-sm text-gray-500">Choose your brand color</span>
                                    </div>
                                </div>
                            </>
                        )}

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                                Password
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="new-password"
                                required
                                value={formData.password}
                                onChange={handleChange}
                                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                                placeholder="Minimum 8 characters"
                            />
                        </div>

                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                                Confirm Password
                            </label>
                            <input
                                id="confirmPassword"
                                name="confirmPassword"
                                type="password"
                                autoComplete="new-password"
                                required
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                                placeholder="Confirm your password"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="rounded-md bg-red-50 p-4">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="ml-3">
                                    <h3 className="text-sm font-medium text-red-800">
                                        {error}
                                    </h3>
                                </div>
                            </div>
                        </div>
                    )}

                    {success && (
                        <div className="rounded-md bg-green-50 p-4">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="ml-3">
                                    <h3 className="text-sm font-medium text-green-800">
                                        {success}
                                    </h3>
                                </div>
                            </div>
                        </div>
                    )}

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading
                                ? (isCreatingTenant ? 'Creating Company...' : 'Creating Account...')
                                : (isCreatingTenant ? 'Create Company' : 'Create Account')
                            }
                        </button>
                    </div>

                    <div className="text-center">
                        <button
                            type="button"
                            onClick={onSwitchToLogin}
                            className="text-indigo-600 hover:text-indigo-500 text-sm font-medium"
                        >
                            Already have an account? Sign in
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}



