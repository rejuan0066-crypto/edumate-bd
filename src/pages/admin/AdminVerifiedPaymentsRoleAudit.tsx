import AdminLayout from '@/components/AdminLayout';
import ModuleRoleAuditView from '@/components/admin/ModuleRoleAuditView';

const AdminVerifiedPaymentsRoleAudit = () => (
  <AdminLayout>
    <ModuleRoleAuditView
      config={{
        menuPath: '/admin/verified-payments',
        titleEn: 'Verified Payments — Role Audit',
        titleBn: 'ভেরিফায়েড পেমেন্ট — রোল অডিট',
        subtitleEn:
          'Audit who can verify payments and edit transaction entries. Re-sync to canonical roles.',
        subtitleBn:
          'কারা পেমেন্ট ভেরিফাই ও ট্রানজেকশন এডিট করতে পারবে যাচাই করুন এবং canonical রোলে রি-সিঙ্ক করুন।',
        roleAccess: {
          super_admin: 'view-edit-delete',
          admin: 'view-edit',
          accounts: 'view-edit',
        },
      }}
    />
  </AdminLayout>
);

export default AdminVerifiedPaymentsRoleAudit;
