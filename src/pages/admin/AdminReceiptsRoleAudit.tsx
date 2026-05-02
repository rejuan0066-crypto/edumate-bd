import AdminLayout from '@/components/AdminLayout';
import ModuleRoleAuditView from '@/components/admin/ModuleRoleAuditView';

const AdminReceiptsRoleAudit = () => (
  <AdminLayout>
    <ModuleRoleAuditView
      config={{
        menuPath: '/admin/receipts',
        titleEn: 'Receipts — Role Audit',
        titleBn: 'রসিদ — রোল অডিট',
        subtitleEn:
          'Audit who can generate and download fee receipts. Re-sync to canonical roles.',
        subtitleBn:
          'কারা ফি রসিদ জেনারেট ও ডাউনলোড করতে পারবে যাচাই করুন এবং canonical রোলে রি-সিঙ্ক করুন।',
        roleAccess: {
          super_admin: 'view-edit-delete',
          admin: 'view-edit',
          accounts: 'view-edit',
        },
      }}
    />
  </AdminLayout>
);

export default AdminReceiptsRoleAudit;
