import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

// Helper function to get week dates
function getWeekDates(weekOffset = 0) {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // adjust when day is Sunday
  const monday = new Date(today.setDate(diff + (weekOffset * 7)));
  const friday = new Date(monday);
  friday.setDate(friday.getDate() + 4);
  
  return {
    startDate: new Date(monday.getFullYear(), monday.getMonth(), monday.getDate()),
    endDate: new Date(friday.getFullYear(), friday.getMonth(), friday.getDate()),
  };
}

async function seedAllocations() {
  let connection;
  try {
    connection = await mysql.createConnection(DATABASE_URL);
    
    console.log('Fetching projects...');
    const [projects] = await connection.execute('SELECT id, managerId FROM projects WHERE isDeleted = 0');
    console.log(`Found ${projects.length} active projects`);
    
    if (projects.length === 0) {
      console.log('No projects found');
      return;
    }
    
    // Get developers (backend, frontend, mobile, fullstack) and QA (qa)
    console.log('Fetching developers and QA analysts...');
    const [employees] = await connection.execute(
      "SELECT id, name, type FROM employees WHERE isDeleted = 0 AND type IN ('backend', 'frontend', 'mobile', 'fullstack', 'qa')"
    );
    console.log(`Found ${employees.length} developers and QA analysts`);
    
    if (employees.length === 0) {
      console.log('No developers or QA analysts found');
      return;
    }
    
    // Get this week and next week dates
    const thisWeek = getWeekDates(0);
    const nextWeek = getWeekDates(1);
    
    console.log(`This week: ${thisWeek.startDate.toISOString().split('T')[0]} to ${thisWeek.endDate.toISOString().split('T')[0]}`);
    console.log(`Next week: ${nextWeek.startDate.toISOString().split('T')[0]} to ${nextWeek.endDate.toISOString().split('T')[0]}`);
    
    let allocationsCreated = 0;
    
    // For each project
    for (const project of projects) {
      console.log(`\nProcessing project ID ${project.id}...`);
      
      // Randomly select 2-4 employees for this project
      const numEmployees = Math.floor(Math.random() * 3) + 2; // 2-4 employees
      const shuffled = [...employees].sort(() => Math.random() - 0.5);
      const selectedEmployees = shuffled.slice(0, numEmployees);
      
      // Create allocations for this week and next week
      for (const employee of selectedEmployees) {
        // This week allocation
        const thisWeekHours = Math.floor(Math.random() * 32) + 8; // 8-40 hours
        const thisWeekAllocation = {
          employeeId: employee.id,
          projectId: project.id,
          allocatedHours: thisWeekHours,
          startDate: thisWeek.startDate,
          endDate: thisWeek.endDate,
          isActive: 1,
        };
        
        try {
          await connection.execute(
            'INSERT INTO allocations (employeeId, projectId, allocatedHours, startDate, endDate, isActive) VALUES (?, ?, ?, ?, ?, ?)',
            [
              thisWeekAllocation.employeeId,
              thisWeekAllocation.projectId,
              thisWeekAllocation.allocatedHours,
              thisWeekAllocation.startDate,
              thisWeekAllocation.endDate,
              thisWeekAllocation.isActive,
            ]
          );
          allocationsCreated++;
          console.log(`  ✓ Created allocation for ${employee.name} (${employee.type}) - ${thisWeekHours}h this week`);
        } catch (error) {
          if (error.code === 'ER_DUP_ENTRY') {
            console.log(`  ⚠ Allocation already exists for ${employee.name} this week`);
          } else {
            console.error(`  ✗ Error creating allocation: ${error.message}`);
          }
        }
        
        // Next week allocation
        const nextWeekHours = Math.floor(Math.random() * 32) + 8; // 8-40 hours
        const nextWeekAllocation = {
          employeeId: employee.id,
          projectId: project.id,
          allocatedHours: nextWeekHours,
          startDate: nextWeek.startDate,
          endDate: nextWeek.endDate,
          isActive: 1,
        };
        
        try {
          await connection.execute(
            'INSERT INTO allocations (employeeId, projectId, allocatedHours, startDate, endDate, isActive) VALUES (?, ?, ?, ?, ?, ?)',
            [
              nextWeekAllocation.employeeId,
              nextWeekAllocation.projectId,
              nextWeekAllocation.allocatedHours,
              nextWeekAllocation.startDate,
              nextWeekAllocation.endDate,
              nextWeekAllocation.isActive,
            ]
          );
          allocationsCreated++;
          console.log(`  ✓ Created allocation for ${employee.name} (${employee.type}) - ${nextWeekHours}h next week`);
        } catch (error) {
          if (error.code === 'ER_DUP_ENTRY') {
            console.log(`  ⚠ Allocation already exists for ${employee.name} next week`);
          } else {
            console.error(`  ✗ Error creating allocation: ${error.message}`);
          }
        }
      }
    }
    
    console.log(`\n✅ Successfully created ${allocationsCreated} allocations`);
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

seedAllocations();

