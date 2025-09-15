'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface Note {
    id: number;
    title: string;
    content: string;
    created_at: string;
    updated_at: string;
    created_by_email: string;
    tags?: string[];
    category?: string;
    is_shared?: boolean;
    shared_with?: number[];
    is_archived?: boolean;
}

export default function NotesDashboard() {
    const { user, token, logout, refreshUser } = useAuth();
    const [notes, setNotes] = useState<Note[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newNote, setNewNote] = useState({
        title: '',
        content: '',
        tags: [] as string[],
        category: '',
        isShared: false
    });
    const [creating, setCreating] = useState(false);
    const [currentTime, setCurrentTime] = useState(() => new Date());
    const [timeKey, setTimeKey] = useState(0);
    const [isClient, setIsClient] = useState(false);

    // New state for enhanced features
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [showArchived, setShowArchived] = useState(false);
    const [showTenantCreation, setShowTenantCreation] = useState(false);
    const [showInviteForm, setShowInviteForm] = useState(false);
    const [categories, setCategories] = useState<string[]>([]);
    const [allTags, setAllTags] = useState<string[]>([]);
    const [newTag, setNewTag] = useState('');
    const [inviteData, setInviteData] = useState({
        email: '',
        firstName: '',
        lastName: '',
        role: 'member'
    });

    // Helper function to format date and time
    const formatDateTime = (dateString: string) => {
        try {
            const date = new Date(dateString);

            // Check if date is valid
            if (isNaN(date.getTime())) {
                return 'Invalid date';
            }

            // Always show full date and time
            return date.toLocaleString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
        } catch (error) {
            console.error('Date formatting error:', error);
            return 'Invalid date';
        }
    };

    // Helper function to get full date and time for tooltip
    const getFullDateTime = (dateString: string) => {
        try {
            const date = new Date(dateString);

            // Check if date is valid
            if (isNaN(date.getTime())) {
                return 'Invalid date';
            }

            return date.toLocaleString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
            });
        } catch (error) {
            console.error('Date formatting error:', error);
            return 'Invalid date';
        }
    };

    useEffect(() => {
        fetchNotes();
    }, []);

    // Set client-side flag
    useEffect(() => {
        setIsClient(true);
    }, []);

    // Update current time every second
    useEffect(() => {
        if (!isClient) return;

        const updateTime = () => {
            const now = new Date();
            setCurrentTime(now);
            setTimeKey(prev => prev + 1);
        };

        // Set initial time
        updateTime();

        const interval = setInterval(updateTime, 1000);

        return () => clearInterval(interval);
    }, [isClient]);

    const fetchNotes = async () => {
        try {
            const params = new URLSearchParams();
            if (searchQuery) params.append('search', searchQuery);
            if (selectedCategory) params.append('category', selectedCategory);
            if (selectedTags.length > 0) params.append('tags', selectedTags.join(','));
            params.append('archived', showArchived.toString());

            const response = await fetch(`/api/notes?${params}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                setNotes(data.notes);

                // Extract unique categories and tags
                const uniqueCategories = [...new Set(data.notes.map((note: Note) => note.category).filter(Boolean))] as string[];
                const uniqueTags = [...new Set(data.notes.flatMap((note: Note) => note.tags || []))] as string[];
                setCategories(uniqueCategories);
                setAllTags(uniqueTags);
            } else {
                setError('Failed to fetch notes');
            }
        } catch (error) {
            setError('Failed to fetch notes');
        } finally {
            setLoading(false);
        }
    };

    const createNote = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        setError('');

        try {
            const response = await fetch('/api/notes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    ...newNote,
                    isShared: newNote.isShared,
                    sharedWith: []
                }),
            });

            if (response.ok) {
                const data = await response.json();
                setNotes([data.note, ...notes]);
                setNewNote({ title: '', content: '', tags: [], category: '', isShared: false });
                setShowCreateForm(false);
                await fetchNotes(); // Refresh to update categories and tags
            } else {
                const errorData = await response.json();
                setError(errorData.error || 'Failed to create note');
            }
        } catch (error) {
            setError('Failed to create note');
        } finally {
            setCreating(false);
        }
    };

    const deleteNote = async (id: number) => {
        if (!confirm('Are you sure you want to delete this note?')) return;

        try {
            const response = await fetch(`/api/notes/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                setNotes(notes.filter(note => note.id !== id));
            } else {
                setError('Failed to delete note');
            }
        } catch (error) {
            setError('Failed to delete note');
        }
    };

    const upgradeTenant = async () => {
        if (!confirm('Upgrade to Pro plan? This will remove the note limit.')) return;

        try {
            const response = await fetch(`/api/tenants/${user?.tenant.slug}/upgrade`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                // Refresh user data to update subscription status
                await refreshUser();
                await fetchNotes(); // Also refresh notes to update any limit changes
            } else {
                const errorData = await response.json();
                setError(errorData.error || 'Failed to upgrade');
            }
        } catch (error) {
            setError('Failed to upgrade');
        }
    };

    const downgradeTenant = async () => {
        if (!confirm('Downgrade to Free plan? This will limit notes to 3 maximum.')) return;

        try {
            const response = await fetch(`/api/tenants/${user?.tenant.slug}/downgrade`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                // Refresh user data to update subscription status
                await refreshUser();
                await fetchNotes(); // Also refresh notes to update any limit changes
            } else {
                const errorData = await response.json();
                setError(errorData.error || 'Failed to downgrade');
            }
        } catch (error) {
            setError('Failed to downgrade');
        }
    };

    // New functions for enhanced features
    const addTagToNote = (tag: string) => {
        if (tag && !newNote.tags.includes(tag)) {
            setNewNote({ ...newNote, tags: [...newNote.tags, tag] });
            setNewTag('');
        }
    };

    const removeTagFromNote = (tagToRemove: string) => {
        setNewNote({ ...newNote, tags: newNote.tags.filter(tag => tag !== tagToRemove) });
    };

    const archiveNote = async (id: number) => {
        try {
            const response = await fetch(`/api/notes/${id}/archive`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ archived: true }),
            });

            if (response.ok) {
                await fetchNotes();
            } else {
                setError('Failed to archive note');
            }
        } catch (error) {
            setError('Failed to archive note');
        }
    };

    const unarchiveNote = async (id: number) => {
        try {
            const response = await fetch(`/api/notes/${id}/archive`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ archived: false }),
            });

            if (response.ok) {
                await fetchNotes();
            } else {
                setError('Failed to unarchive note');
            }
        } catch (error) {
            setError('Failed to unarchive note');
        }
    };

    const createTenant = async (tenantData: { companyName: string; adminEmail: string; adminPassword: string; adminFirstName: string; adminLastName: string; themeColor?: string }) => {
        try {
            const response = await fetch('/api/tenants', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(tenantData),
            });

            if (response.ok) {
                const data = await response.json();
                // Store the new token and refresh user
                localStorage.setItem('token', data.token);
                await refreshUser();
                setShowTenantCreation(false);
                setSuccess('Company created successfully!');
            } else {
                const errorData = await response.json();
                setError(errorData.error || 'Failed to create tenant');
            }
        } catch (error) {
            setError('Failed to create tenant');
        }
    };

    const inviteUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        try {
            const response = await fetch(`/api/tenants/${user?.tenant.slug}/invite`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(inviteData),
            });

            const data = await response.json();

            if (response.ok) {
                setInviteData({ email: '', firstName: '', lastName: '', role: 'member' });
                setShowInviteForm(false);
                setError('');

                // Show success message
                if (data.emailSent) {
                    setSuccess(`Invitation sent successfully to ${inviteData.email}! They will receive an email with instructions.`);
                } else {
                    setSuccess(`Invitation created for ${inviteData.email}! Please share this link: ${data.invitation.invitationLink}`);
                }

                // Clear success message after 5 seconds
                setTimeout(() => setSuccess(''), 5000);
            } else {
                setError(data.error || 'Failed to send invitation');
            }
        } catch (error) {
            setError('Failed to send invitation');
        }
    };

    const canCreateNote = (user?.tenant?.subscription_plan === 'pro') || notes.length < 3;

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                    <div className="text-lg text-gray-600">Loading your notes...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
            {/* Enhanced Navigation */}
            <nav className="bg-white shadow-lg border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-3">
                                <div className="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                                    <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-gray-900">
                                        {user?.tenant.name}
                                    </h1>
                                    <p className="text-sm text-gray-500">Notes Workspace</p>
                                </div>
                            </div>
                            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${(user?.tenant?.subscription_plan === 'pro')
                                ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border border-green-200'
                                : 'bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-800 border border-yellow-200'
                                }`}>
                                {(user?.tenant?.subscription_plan === 'pro') ? '✨ Pro Plan' : '📝 Free Plan'}
                            </span>
                        </div>
                        <div className="flex items-center space-x-4">
                            <div className="hidden sm:block text-right">
                                <p className="text-sm font-medium text-gray-900">{user?.email}</p>
                                <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                            </div>
                            {isClient && (
                                <div key={timeKey} className="hidden md:block text-right">
                                    <p className="text-sm font-medium text-gray-900">
                                        {currentTime.toLocaleString('en-US', {
                                            weekday: 'short',
                                            year: 'numeric',
                                            month: 'short',
                                            day: 'numeric'
                                        })}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {currentTime.toLocaleString('en-US', {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            second: '2-digit',
                                            hour12: true
                                        })}
                                    </p>
                                </div>
                            )}
                            {user?.role === 'admin' && (
                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => setShowInviteForm(true)}
                                        className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:from-blue-700 hover:to-cyan-700 transition-all duration-200 shadow-md hover:shadow-lg"
                                    >
                                        👥 Invite User
                                    </button>
                                    {user?.tenant.subscription_plan === 'free' ? (
                                        <button
                                            onClick={upgradeTenant}
                                            className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-md hover:shadow-lg"
                                        >
                                            🚀 Upgrade to Pro
                                        </button>
                                    ) : (
                                        <button
                                            onClick={downgradeTenant}
                                            className="bg-gradient-to-r from-orange-600 to-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:from-orange-700 hover:to-red-700 transition-all duration-200 shadow-md hover:shadow-lg"
                                        >
                                            ⬇️ Remove Pro Plan
                                        </button>
                                    )}
                                </div>
                            )}
                            <button
                                onClick={logout}
                                className="bg-gradient-to-r from-red-600 to-rose-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:from-red-700 hover:to-rose-700 transition-all duration-200 shadow-md hover:shadow-lg"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <div className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
                <div className="px-4 py-6 sm:px-0">
                    {error && (
                        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                            <div className="flex items-center">
                                <svg className="h-5 w-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {error}
                            </div>
                        </div>
                    )}

                    {success && (
                        <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                            <div className="flex items-center">
                                <svg className="h-5 w-5 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                {success}
                            </div>
                        </div>
                    )}

                    {/* Search and Filter Section */}
                    <div className="mb-6 bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                            {/* Search */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search notes..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 placeholder-gray-500"
                                />
                            </div>

                            {/* Category Filter */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                                <select
                                    value={selectedCategory}
                                    onChange={(e) => setSelectedCategory(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white"
                                >
                                    <option value="">All Categories</option>
                                    {categories.map(category => (
                                        <option key={category} value={category}>{category}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Tags Filter */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
                                <div className="flex flex-wrap gap-1">
                                    {allTags.slice(0, 3).map(tag => (
                                        <button
                                            key={tag}
                                            onClick={() => {
                                                if (selectedTags.includes(tag)) {
                                                    setSelectedTags(selectedTags.filter(t => t !== tag));
                                                } else {
                                                    setSelectedTags([...selectedTags, tag]);
                                                }
                                            }}
                                            className={`px-2 py-1 text-xs rounded-full ${selectedTags.includes(tag)
                                                ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                                                : 'bg-gray-100 text-gray-600 border border-gray-200'
                                                }`}
                                        >
                                            {tag}
                                        </button>
                                    ))}
                                    {allTags.length > 3 && (
                                        <span className="text-xs text-gray-500">+{allTags.length - 3} more</span>
                                    )}
                                </div>
                            </div>

                            {/* Archive Filter */}
                            <div className="flex items-end">
                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={showArchived}
                                        onChange={(e) => setShowArchived(e.target.checked)}
                                        className="mr-2"
                                    />
                                    <span className="text-sm font-medium text-gray-700">Show Archived</span>
                                </label>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={fetchNotes}
                                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
                            >
                                Apply Filters
                            </button>
                            <button
                                onClick={() => {
                                    setSearchQuery('');
                                    setSelectedCategory('');
                                    setSelectedTags([]);
                                    setShowArchived(false);
                                    fetchNotes();
                                }}
                                className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-300"
                            >
                                Clear Filters
                            </button>
                        </div>
                    </div>

                    {/* Header Section */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
                        <div>
                            <h2 className="text-3xl font-bold text-gray-900 mb-2">Your Notes</h2>
                            <p className="text-gray-600">
                                {notes.length === 0 ? 'No notes yet' : `${notes.length} note${notes.length === 1 ? '' : 's'}`}
                                {user?.tenant.subscription_plan === 'free' && ` (${notes.length}/3 limit)`}
                            </p>
                            {isClient && (
                                <div key={`main-time-${timeKey}`} className="mt-2 flex items-center space-x-2 text-sm text-gray-500">
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span>
                                        {currentTime.toLocaleString('en-US', {
                                            weekday: 'long',
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            second: '2-digit',
                                            hour12: true
                                        })}
                                    </span>
                                </div>
                            )}
                        </div>
                        {canCreateNote ? (
                            <button
                                onClick={() => setShowCreateForm(!showCreateForm)}
                                className="mt-4 sm:mt-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2"
                            >
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                <span>{showCreateForm ? 'Cancel' : 'Create Note'}</span>
                            </button>
                        ) : (
                            <div className="mt-4 sm:mt-0 text-center">
                                <p className="text-red-600 font-medium mb-2">📝 Note limit reached (3/3)</p>
                                {user?.role === 'admin' && (
                                    <button
                                        onClick={upgradeTenant}
                                        className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-lg text-sm font-medium hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                                    >
                                        🚀 Upgrade to Pro
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Create Note Form */}
                    {showCreateForm && (
                        <div className="mb-8 bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                            <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                                <svg className="h-6 w-6 text-indigo-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Create New Note
                            </h3>
                            <form onSubmit={createNote} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Title
                                    </label>
                                    <input
                                        type="text"
                                        value={newNote.title}
                                        onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-gray-900"
                                        placeholder="Enter note title..."
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Content
                                    </label>
                                    <textarea
                                        value={newNote.content}
                                        onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                                        rows={6}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-gray-900"
                                        placeholder="Write your note content here..."
                                        required
                                    />
                                </div>

                                {/* Category */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Category
                                    </label>
                                    <input
                                        type="text"
                                        value={newNote.category}
                                        onChange={(e) => setNewNote({ ...newNote, category: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-gray-900 placeholder-gray-500 bg-white"
                                        placeholder="e.g., Work, Personal, Project..."
                                    />
                                </div>

                                {/* Tags */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Tags
                                    </label>
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        {newNote.tags.map((tag, index) => (
                                            <span
                                                key={index}
                                                className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-indigo-100 text-indigo-800"
                                            >
                                                {tag}
                                                <button
                                                    type="button"
                                                    onClick={() => removeTagFromNote(tag)}
                                                    className="ml-2 text-indigo-600 hover:text-indigo-800"
                                                >
                                                    ×
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                    <div className="flex space-x-2">
                                        <input
                                            type="text"
                                            value={newTag}
                                            onChange={(e) => setNewTag(e.target.value)}
                                            onKeyPress={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    addTagToNote(newTag);
                                                }
                                            }}
                                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 placeholder-gray-500"
                                            placeholder="Add a tag..."
                                        />
                                        <button
                                            type="button"
                                            onClick={() => addTagToNote(newTag)}
                                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                                        >
                                            Add
                                        </button>
                                    </div>
                                </div>

                                {/* Share Option */}
                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id="isShared"
                                        checked={newNote.isShared}
                                        onChange={(e) => setNewNote({ ...newNote, isShared: e.target.checked })}
                                        className="mr-2"
                                    />
                                    <label htmlFor="isShared" className="text-sm font-medium text-gray-700">
                                        Share this note with team members
                                    </label>
                                </div>
                                <div className="flex space-x-3">
                                    <button
                                        type="submit"
                                        disabled={creating}
                                        className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg"
                                    >
                                        {creating ? 'Creating...' : 'Create Note'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateForm(false)}
                                        className="bg-gray-200 text-gray-800 px-6 py-3 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Notes Grid */}
                    <div className="grid gap-6">
                        {notes.length === 0 ? (
                            <div className="text-center py-16">
                                <div className="mx-auto h-24 w-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                                    <svg className="h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-semibold text-gray-900 mb-2">No notes yet</h3>
                                <p className="text-gray-500 mb-6">Create your first note to get started!</p>
                                {canCreateNote && (
                                    <button
                                        onClick={() => setShowCreateForm(true)}
                                        className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                                    >
                                        Create Your First Note
                                    </button>
                                )}
                            </div>
                        ) : (
                            notes.map((note) => (
                                <div key={note.id} className={`bg-white p-6 rounded-xl shadow-lg border border-gray-200 hover:shadow-xl transition-shadow duration-200 ${note.is_archived ? 'opacity-75 bg-gray-50' : ''}`}>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex-1 pr-4">
                                            <h3 className="text-xl font-semibold text-gray-900 mb-2">{note.title}</h3>

                                            {/* Tags and Category */}
                                            <div className="flex flex-wrap gap-2 mb-2">
                                                {note.category && (
                                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                        📁 {note.category}
                                                    </span>
                                                )}
                                                {note.tags && note.tags.map((tag, index) => (
                                                    <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                                        #{tag}
                                                    </span>
                                                ))}
                                                {note.is_shared && (
                                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                        👥 Shared
                                                    </span>
                                                )}
                                                {note.is_archived && (
                                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                        📦 Archived
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex space-x-1">
                                            {!note.is_archived ? (
                                                <button
                                                    onClick={() => archiveNote(note.id)}
                                                    className="text-yellow-500 hover:text-yellow-700 p-2 hover:bg-yellow-50 rounded-lg transition-colors"
                                                    title="Archive note"
                                                >
                                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8l4 4-4 4m5-4h6" />
                                                    </svg>
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => unarchiveNote(note.id)}
                                                    className="text-green-500 hover:text-green-700 p-2 hover:bg-green-50 rounded-lg transition-colors"
                                                    title="Unarchive note"
                                                >
                                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4-4-4-4m5 4h6" />
                                                    </svg>
                                                </button>
                                            )}
                                            <button
                                                onClick={() => deleteNote(note.id)}
                                                className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Delete note"
                                            >
                                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                    <div className="prose prose-gray max-w-none mb-4">
                                        <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{note.content}</p>
                                    </div>
                                    <div className="flex items-center justify-between text-sm text-gray-500 pt-4 border-t border-gray-100">
                                        <div className="flex items-center space-x-4">
                                            <span className="flex items-center">
                                                <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                </svg>
                                                {note.created_by_email}
                                            </span>
                                            <span className="flex items-center" title={getFullDateTime(note.updated_at)}>
                                                <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                Updated {formatDateTime(note.updated_at)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Tenant Creation Modal */}
            {showTenantCreation && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-xl shadow-xl max-w-md w-full mx-4">
                        <h3 className="text-xl font-semibold text-gray-900 mb-4">Create New Company</h3>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const formData = new FormData(e.target as HTMLFormElement);
                            createTenant({
                                companyName: (formData.get('companyName') as string) || '',
                                adminEmail: (formData.get('adminEmail') as string) || '',
                                adminPassword: (formData.get('adminPassword') as string) || '',
                                adminFirstName: (formData.get('adminFirstName') as string) || '',
                                adminLastName: (formData.get('adminLastName') as string) || '',
                                themeColor: (formData.get('themeColor') as string) || undefined
                            });
                        }}>
                            <div className="space-y-4">
                                <input
                                    name="companyName"
                                    type="text"
                                    placeholder="Company Name"
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900 placeholder-gray-500"
                                />
                                <input
                                    name="adminEmail"
                                    type="email"
                                    placeholder="Admin Email"
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900 placeholder-gray-500"
                                />
                                <input
                                    name="adminPassword"
                                    type="password"
                                    placeholder="Admin Password"
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900 placeholder-gray-500"
                                />
                                <div className="grid grid-cols-2 gap-2">
                                    <input
                                        name="adminFirstName"
                                        type="text"
                                        placeholder="First Name"
                                        required
                                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900 placeholder-gray-500"
                                    />
                                    <input
                                        name="adminLastName"
                                        type="text"
                                        placeholder="Last Name"
                                        required
                                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900 placeholder-gray-500"
                                    />
                                </div>
                                <input
                                    name="themeColor"
                                    type="color"
                                    defaultValue="#3B82F6"
                                    className="w-full h-10 border border-gray-300 rounded-lg"
                                />
                            </div>
                            <div className="flex space-x-3 mt-6">
                                <button
                                    type="submit"
                                    className="flex-1 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700"
                                >
                                    Create Company
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowTenantCreation(false)}
                                    className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* User Invitation Modal */}
            {showInviteForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-xl shadow-xl max-w-md w-full mx-4">
                        <h3 className="text-xl font-semibold text-gray-900 mb-4">Invite User</h3>
                        <form onSubmit={inviteUser}>
                            <div className="space-y-4">
                                <input
                                    type="email"
                                    placeholder="Email Address"
                                    value={inviteData.email}
                                    onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900 placeholder-gray-500"
                                />
                                <div className="grid grid-cols-2 gap-2">
                                    <input
                                        type="text"
                                        placeholder="First Name"
                                        value={inviteData.firstName}
                                        onChange={(e) => setInviteData({ ...inviteData, firstName: e.target.value })}
                                        required
                                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900 placeholder-gray-500"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Last Name"
                                        value={inviteData.lastName}
                                        onChange={(e) => setInviteData({ ...inviteData, lastName: e.target.value })}
                                        required
                                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900 placeholder-gray-500"
                                    />
                                </div>
                                <select
                                    value={inviteData.role}
                                    onChange={(e) => setInviteData({ ...inviteData, role: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900 bg-white"
                                >
                                    <option value="member">Member</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <div className="flex space-x-3 mt-6">
                                <button
                                    type="submit"
                                    className="flex-1 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700"
                                >
                                    Send Invitation
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowInviteForm(false)}
                                    className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}