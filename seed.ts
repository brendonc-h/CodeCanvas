import { db } from './server/db';
import { users, projects, files, templateConfigs } from './shared/schema';
import bcrypt from 'bcrypt';

async function seed() {
  console.log('Seeding database...');

  try {
    // Create demo user
    const demoPasswordHash = await bcrypt.hash('demo', 10);
    const demoUser = await db.insert(users).values({
      email: 'demo@webide.dev',
      username: 'demo',
      passwordHash: demoPasswordHash,
    }).returning();

    console.log('Created demo user:', demoUser[0]);

    // Create a sample project for the demo user
    const sampleProject = await db.insert(projects).values({
      userId: demoUser[0].id,
      name: 'Welcome Project',
      template: 'vite-react-ts',
      description: 'A sample project to get you started',
    }).returning();

    console.log('Created sample project:', sampleProject[0]);

    // Create template files for the project
    const template = templateConfigs['vite-react-ts'];
    for (const [filePath, content] of Object.entries(template.files)) {
      await db.insert(files).values({
        projectId: sampleProject[0].id,
        path: filePath,
        content: content as string,
      });
    }

    console.log('Seeded database successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

// Run seeding if this script is executed directly
if (require.main === module) {
  seed().then(() => process.exit(0));
}

export { seed };
