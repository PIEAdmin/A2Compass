import BulletinBoard from '../../components/shared/BulletinBoard';

export default function AdminBulletinBoard() {
  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">📋 Bulletin Board</h1>
        <p className="text-gray-500 mt-1">
          Birthdays, holidays, semester progress, and school year compliance at a glance.
        </p>
      </div>
      <BulletinBoard role="admin" />
    </div>
  );
}
