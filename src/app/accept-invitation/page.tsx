import { Suspense } from 'react';
import AcceptInvitationClient from './AcceptInvitationClient';

export default function AcceptInvitationPage() {
	return (
		<Suspense
			fallback={
				<div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
					<div className="text-center">
						<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
						<div className="text-lg text-gray-600">Loading...</div>
					</div>
				</div>
			}
		>
			<AcceptInvitationClient />
		</Suspense>
	);
}
