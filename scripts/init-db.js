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
    await db.sequelize.sync(wipe ? { force: true } : {});
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

    const project = await db.project.create({
      name: "Scrum System",
      description: "A project management system",
      status: "active",
      startDate: new Date(),
      endDate: null,
      userId: user.id,
    });

    const sprint = await db.sprint.create({
      name: "Sprint 1",
      startDate: new Date(),
      endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      projectId: project.id,
    });

    const todoColumn = await db.projectColumn.create({
      title: "To Do",
      displayOrder: 1,
      projectId: project.id,
    });

    const inProgressColumn = await db.projectColumn.create({
      title: "In Progress",
      displayOrder: 2,
      projectId: project.id,
    });

    const doneColumn = await db.projectColumn.create({
      title: "Done",
      displayOrder: 3,
      projectId: project.id,
    });

    const story1 = await db.userStory.create({
      title: "View storyboard by status",
      description: "As a user, I want to see items organized in columns.",
      priority: "High",
      storyPoint: 3,
      projectId: project.id,
      columnId: todoColumn.id,
    });

    const story2 = await db.userStory.create({
      title: "Create a new project",
      description: "As a user, I want to create a new project.",
      priority: "Medium",
      storyPoint: 5,
      projectId: project.id,
      columnId: inProgressColumn.id,
    });

    const story3 = await db.userStory.create({
      title: "Login page",
      description: "As a user, I want to log into the system.",
      priority: "High",
      storyPoint: 2,
      projectId: project.id,
      columnId: doneColumn.id,
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
      columnIds: [todoColumn.id, inProgressColumn.id, doneColumn.id],
      storyIds: [story1.id, story2.id, story3.id],
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
