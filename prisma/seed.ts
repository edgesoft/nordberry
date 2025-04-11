// prisma/seed.ts
import { PrismaClient, TaskStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log(`Start seeding ...`);

  // 1. Rensa databasen (i omvänd ordning av beroenden för säkerhets skull)
  console.log('Deleting existing data...');
  await prisma.comment.deleteMany();
  await prisma.file.deleteMany();
  await prisma.taskUser.deleteMany(); // Tar bort kopplingar mellan Task och User

  // Nu kan vi ta bort Tasks. Prisma bör hantera M2M-relationen "TaskDependencies" automatiskt.
  await prisma.task.deleteMany();

  // Sedan kedjor, projekt och användare
  await prisma.chain.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();
  console.log('Existing data deleted.');

  // 2. Skapa Användare
  console.log('Creating users...');
  const userAdmin = await prisma.user.create({
    data: {
      email: 'admin@cloudberry.se',
      name: 'Admin Adminsson',
      status: 'active',
      role: 'admin',
      clerkUserId: 'user_clerk_admin_placeholder', // Ersätt med riktigt ID sen
    },
  });
  const userCreator = await prisma.user.create({
    data: {
      email: 'creator@cloudberry.se',
      name: 'Karin Kreatör',
      status: 'active',
      role: 'creator',
      clerkUserId: 'user_clerk_creator_placeholder',
    },
  });
  const userExecutor = await prisma.user.create({
    data: {
      email: 'executor@cloudberry.se',
      name: 'Erik Exekutör',
      status: 'active',
      role: 'executor',
      clerkUserId: 'user_clerk_executor_placeholder',
    },
  });
  console.log('Users created.');

  // 3. Skapa Projekt
  console.log('Creating projects...');
  const projectKonferens = await prisma.project.create({
    data: {
      name: 'Sommarkonferens 2025',
      description: 'Planering och genomförande av årets sommarkonferens',
    },
  });
  console.log('Projects created.');

  // 4. Skapa Kedjor (Chains)
  console.log('Creating chains...');
  const chainUtflykt = await prisma.chain.create({
    data: {
      name: 'Utflyktsplanering',
      project: { connect: { id: projectKonferens.id } },
      owner: { connect: { id: userCreator.id } },
    },
  });
  const chainWebb = await prisma.chain.create({
    data: {
      name: 'Webbpublicering',
      project: { connect: { id: projectKonferens.id } },
      owner: { connect: { id: userCreator.id } },
    },
  });
  const chainBudget = await prisma.chain.create({
    data: {
      name: 'Budget',
      project: { connect: { id: projectKonferens.id } },
      owner: { connect: { id: userAdmin.id } },
    },
  });
  console.log('Chains created.');

  // 5. Skapa Tasks (Steg) och Beroenden (Dependencies)
  // Vi måste skapa dem i en ordning så att vi kan referera till ID:n för beroenden
  console.log('Creating tasks and dependencies...');

  // -- Kedja: Budget --
  const taskBudgetDraft = await prisma.task.create({
    data: {
      title: 'Skapa budgetförslag',
      sortOrder: 1,
      chainId: chainBudget.id, // Använd ID för kedjan
      status: TaskStatus.done // Sätt status direkt för exempeldata
    },
  });
  const taskBudgetApprove = await prisma.task.create({
    data: {
      title: 'Godkänn budget',
      sortOrder: 2,
      chainId: chainBudget.id,
      status: TaskStatus.working,
      dependencies: { // Detta task beror på att budgetförslaget är klart
        connect: [{ id: taskBudgetDraft.id }],
      },
    },
  });

  // -- Kedja: Utflyktsplanering --
  const taskExcursionResearch = await prisma.task.create({
    data: { title: 'Undersök utflyktsmål', sortOrder: 1, chainId: chainUtflykt.id, status: TaskStatus.done },
  });
  const taskExcursionContact = await prisma.task.create({
    data: {
      title: 'Kontakta leverantörer',
      sortOrder: 2,
      chainId: chainUtflykt.id,
      status: TaskStatus.working,
      dependencies: { // Beror på research
        connect: [{ id: taskExcursionResearch.id }],
      },
    },
  });
  const taskExcursionFinalize = await prisma.task.create({
    data: {
      title: 'Färdigställ plan & boka',
      sortOrder: 3,
      chainId: chainUtflykt.id,
      status: TaskStatus.pending, // Väntar
      dependencies: { // Beror på kontakt OCH godkänd budget (från annan kedja)
        connect: [{ id: taskExcursionContact.id }, { id: taskBudgetApprove.id }],
      },
    },
  });

  // -- Kedja: Webbpublicering --
  const taskWebWrite = await prisma.task.create({
    data: { title: 'Skriv texter till webb', sortOrder: 1, chainId: chainWebb.id, status: TaskStatus.working },
  });
  const taskWebPublish = await prisma.task.create({
    data: {
      title: 'Publicera utflyktsinfo',
      sortOrder: 2,
      chainId: chainWebb.id,
      status: TaskStatus.pending, // Väntar
      dependencies: { // Beror på texter OCH att utflyktsplanen är färdig (från annan kedja)
        connect: [{ id: taskWebWrite.id }, { id: taskExcursionFinalize.id }],
      },
    },
  });
  console.log('Tasks and dependencies created.');


  // 6. Tilldela Användare till Tasks (TaskUser)
  console.log('Assigning users to tasks...');
  await prisma.taskUser.createMany({
    data: [
      // Tilldela några användare till olika tasks
      { taskId: taskExcursionResearch.id, userId: userExecutor.id, role: 'worker', approved: true },
      { taskId: taskExcursionContact.id, userId: userExecutor.id, role: 'worker', approved: true },
      { taskId: taskExcursionFinalize.id, userId: userCreator.id, role: 'approver', approved: true }, // Creator godkänner planen
      { taskId: taskBudgetDraft.id, userId: userCreator.id, role: 'worker', approved: true },
      { taskId: taskBudgetApprove.id, userId: userAdmin.id, role: 'approver', approved: true }, // Admin godkänner budget
      { taskId: taskWebWrite.id, userId: userExecutor.id, role: 'worker', approved: true },
      { taskId: taskWebPublish.id, userId: userCreator.id, role: 'worker', approved: true },
    ],
    skipDuplicates: true, // Ignorera om kopplingen redan finns (bra vid flera körningar)
  });
  console.log('Users assigned to tasks.');

  // 7. (Valfritt) Skapa Kommentarer och Filer
  // console.log('Creating comments and files...');
  // await prisma.comment.create({...});
  // await prisma.file.create({...});
  // console.log('Comments and files created.');


  console.log(`Seeding finished.`);
}

main()
  .catch(async (e) => {
    console.error("Error during seeding:", e);
    await prisma.$disconnect();
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });