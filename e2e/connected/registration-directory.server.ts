// Synthetic provider boundary for the explicit local PostgreSQL/browser runner.
// Production never imports this file and never accepts these fixture identities.
if (process.env.CACAU_CONNECTED_QA !== 'local-postgres17') {
  throw new Error('Registration fixture is restricted to the isolated runner.')
}

const user = {
  id: 'b1f5fcd8-7d94-4c51-9856-128930a030e5',
  name: 'Cadastro QA isolado',
  email: 'approved@example.test',
  emailVerified: true,
  banned: false,
  updatedAt: new Date('2026-10-26T10:00:00Z'),
}

export function createRegistrationDirectory() {
  return {
    findByEmail: async (email: string) => (email === user.email ? user : null),
    findById: async (id: string) =>
      id === user.id
        ? user
        : ['qa-owner', 'qa-manager'].includes(id)
          ? {
              ...user,
              id,
              email: `${id.slice(3)}@example.test`,
              name: 'Aprovador QA isolado',
            }
          : null,
  }
}

export async function readPasswordResetSubject() {
  throw new Error(
    'Password reset subject is tested in the separate PostgreSQL directory runner.',
  )
}
