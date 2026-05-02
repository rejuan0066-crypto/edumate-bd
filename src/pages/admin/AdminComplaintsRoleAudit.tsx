import AdminLayout from '@/components/AdminLayout';
import ModuleRoleAuditView from '@/components/admin/ModuleRoleAuditView';

const AdminComplaintsRoleAudit = () => (
  <AdminLayout>
    <ModuleRoleAuditView
      config={{
        menuPath: '/admin/complaints',
        titleEn: 'Complaints — Role Audit',
        titleBn: 'অভিযোগ — রোল অডিট',
        subtitleEn:
          'Audit roles that can view complaints and update their status. Re-sync to canonical roles.',
        subtitleBn:
          'অভিযোগ দেখা ও স্ট্যাটাস আপডেট করার রোলগুলো যাচাই করুন এবং canonical রোলে রি-সিঙ্ক করুন।',
        roleAccess: {
          super_admin: 'view-edit-delete',
          admin: 'view-edit',
        },
      }}
    />
  </AdminLayout>
);

export default AdminComplaintsRoleAudit;
