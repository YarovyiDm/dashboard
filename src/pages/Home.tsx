import { ProjectCard } from '../components/ProjectCard';
import { useKrokyUsers, useKrokyPayments } from '../hooks/useKrokyData';
import { useKmetaUsers } from '../hooks/useKmetaData';

export function Home() {
  const { users } = useKrokyUsers();
  const { payments } = useKrokyPayments();
  const { users: kmetaUsers } = useKmetaUsers();

  const approved = payments.filter(p => p.status === 'approved');
  const totalRevenue = approved.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const proCount = users.filter(u => u.isPro).length;

  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary mb-6">Projects</h1>
      <div className="grid gap-4 max-w-2xl">
        <ProjectCard
          id="kroky"
          name="Kroky"
          description="Resume builder, email signatures, job tracker"
          stats={[
            { label: 'Users', value: users.length },
            { label: 'Revenue', value: `${totalRevenue} UAH` },
            { label: 'Pro', value: proCount },
          ]}
        />
        <ProjectCard
          id="kmeta"
          name="Kmeta"
          description="Platform for tutors"
          stats={[
            { label: 'Users', value: kmetaUsers.length },
            { label: 'Pro', value: kmetaUsers.filter(u => u.plan === 'pro').length },
          ]}
        />
      </div>
    </div>
  );
}
