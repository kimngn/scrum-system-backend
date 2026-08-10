require("dotenv").config();

const db = require("../app/models");
const { getSalt, hashPassword } = require("../app/authentication/crypto");

const args = process.argv.slice(2);
const help = args.includes("--help") || args.includes("-h");
const wipe =
  args.includes("--wipe") ||
  args.includes("--force") ||
  !args.includes("--no-wipe");

if (help) {
  console.log("Usage: node scripts/init-db.js [--no-wipe] [--help]");
  console.log(
    "  --no-wipe   Preserve existing tables and only sync without dropping them.",
  );
  console.log(
    "  --wipe      Drop and recreate all tables before seeding (default).",
  );
  process.exit(0);
}

const run = async () => {
  try {
    console.log(`Syncing database${wipe ? " (force=true)" : ""}...`);
    if (wipe) await db.sequelize.query("SET FOREIGN_KEY_CHECKS = 0");
    await db.sequelize.sync(wipe ? { force: true } : {});
    if (wipe) await db.sequelize.query("SET FOREIGN_KEY_CHECKS = 1");
    console.log("Database synced.");

    const salt = await getSalt();
    const passwordHash = await hashPassword("Test1234!", salt);

    const user = await db.user.create({
      firstName: "Test",
      lastName: "User",
      email: "test@example.com",
      password: passwordHash,
      salt: salt,
      role: "admin",
    });

    const user2 = await db.user.create({
      firstName: "Kim",
      lastName: "Nguyen",
      email: "kim@example.com",
      password: passwordHash,
      salt: salt,
      role: "admin",
    });

    const project = await db.project.create({
      name: "Scrum System",
      description: "A project management system",
      status: "active",
      startDate: new Date(),
      endDate: null,
      userId: user.id,
    });

    // Adds the project's creator as a lead.
    await db.projectMembership.create({
      userId: user.id,
      projectId: project.id,
      role: "lead",
    });

    const sprint = await db.sprint.create({
      name: "Sprint 1",
      startDate: new Date(),
      endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      projectId: project.id,
    });

    const backlogColumn = await db.projectColumn.create({
      title: "Backlog",
      displayOrder: 1,
      projectId: project.id,
    });

    const todoColumn = await db.projectColumn.create({
      title: "To Do",
      displayOrder: 2,
      projectId: project.id,
    });

    const inProgressColumn = await db.projectColumn.create({
      title: "In Progress",
      displayOrder: 3,
      projectId: project.id,
    });

    const readyForTestColumn = await db.projectColumn.create({
      title: "Ready for Test",
      displayOrder: 4,
      projectId: project.id,
    });

    const testingColumn = await db.projectColumn.create({
      title: "Testing",
      displayOrder: 5,
      projectId: project.id,
    });

    const doneColumn = await db.projectColumn.create({
      title: "Done",
      displayOrder: 6,
      projectId: project.id,
    });

    const session = await db.session.create({
      email: user.email,
      userId: user.id,
      expirationDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    console.log("Seed data created:", {
      userId: user.id,
      projectId: project.id,
      sprintId: sprint.id,
      columnIds: [
        backlogColumn.id,
        todoColumn.id,
        inProgressColumn.id,
        readyForTestColumn.id,
        testingColumn.id,
        doneColumn.id,
      ],
      sessionId: session.id,
    });

    const foundProject = await db.project.findByPk(project.id, {
      include: [{ model: db.sprint, as: "sprint" }],
    });
    console.log("Found project with sprints:", {
      id: foundProject.id,
      name: foundProject.name,
      sprintCount: foundProject.sprint.length,
    });

    await db.project.update(
      { name: "Scrum System v2" },
      { where: { id: project.id } },
    );
    const updatedProject = await db.project.findByPk(project.id);
    console.log("Updated project name:", updatedProject.name);

    await db.sprint.destroy({ where: { id: sprint.id } });
    const deletedSprint = await db.sprint.findByPk(sprint.id);
    console.log("Deleted sprint exists?", !!deletedSprint);

    const foundSession = await db.session.findByPk(session.id);
    console.log("Found session:", {
      id: foundSession.id,
      userId: foundSession.userId,
      expirationDate: foundSession.expirationDate,
    });

    console.log("Init + CRUD verification complete.");
    process.exit(0);
  } catch (error) {
    console.error("Init/verify failed:", error);
    process.exit(1);
  }
};

run();
