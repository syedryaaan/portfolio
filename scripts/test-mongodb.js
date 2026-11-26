import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB, { disconnectDB } from '../config/db.js';
import ConnectionTest from '../models/ConnectionTest.js';

/**
 * Standalone MongoDB Atlas Verification & Diagnostic Script
 * Performs:
 * 1. Environment validation
 * 2. Atlas connection test
 * 3. Write test (document creation)
 * 4. Read test (document query)
 * 5. Cleanup test (document deletion)
 * 6. Graceful disconnection
 */
const runVerification = async () => {
  console.log('====================================================');
  console.log('       MONGODB ATLAS VERIFICATION SUITE            ');
  console.log('====================================================');

  const startTime = Date.now();

  try {
    // Step 1: Establish Connection
    console.log('\n[1/5] Initiating connection to MongoDB Atlas...');
    await connectDB();
    console.log('      Status: CONNECTED');

    // Step 2: Database Ping Test
    console.log('\n[2/5] Running administrative ping command...');
    const pingResult = await mongoose.connection.db.admin().ping();
    console.log('      Ping response:', JSON.stringify(pingResult));

    // Step 3: Write Operation Test
    console.log('\n[3/5] Testing Write Operation (Document Creation)...');
    const testDoc = await ConnectionTest.create({
      testName: 'Automated Atlas Diagnostics Test',
      status: 'SUCCESS',
      cluster: 'cluster0.ageb2ld.mongodb.net',
      executedBy: 'syedryaaan_db_user',
      metadata: {
        nodeVersion: process.version,
        platform: process.platform,
        testTimestamp: new Date().toISOString(),
      },
    });
    console.log(`      Created document with _id: ${testDoc._id}`);
    console.log('      Document persisted successfully.');

    // Step 4: Read Operation Test
    console.log('\n[4/5] Testing Read Operation (Document Query)...');
    const fetchedDoc = await ConnectionTest.findById(testDoc._id);
    if (!fetchedDoc) {
      throw new Error(`Failed to find previously created document with ID: ${testDoc._id}`);
    }
    console.log(`      Found document: "${fetchedDoc.testName}" [Status: ${fetchedDoc.status}]`);
    console.log(`      Cluster registered: ${fetchedDoc.cluster}`);

    // Step 5: Clean Up Test Document
    console.log('\n[5/5] Cleaning up test document...');
    await ConnectionTest.findByIdAndDelete(testDoc._id);
    console.log('      Test document removed cleanly.');

    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('\n====================================================');
    console.log(` ALL CHECKS PASSED: MongoDB Atlas is fully operational! (${totalDuration}s)`);
    console.log('====================================================\n');
  } catch (error) {
    console.error('\n====================================================');
    console.error(' [FAILED] MongoDB Atlas Verification Check Failed');
    console.error('====================================================');
    console.error(`Error Type:    ${error.name}`);
    console.error(`Error Message: ${error.message}`);

    if (error.message.includes('<DB_PASSWORD>')) {
      console.error('\n--> Remediation: Please open your .env file and replace <DB_PASSWORD> with your actual MongoDB Atlas database user password.');
    } else if (error.name === 'MongoServerError' && error.message.includes('bad auth')) {
      console.error('\n--> Remediation: Authentication failed. Please verify that:');
      console.error('    1. The password in your .env MONGODB_URI matches the Atlas database user password for "syedryaaan_db_user".');
      console.error('    2. Special characters in the password are URL-encoded (e.g. @ -> %40, # -> %23, : -> %3A).');
    } else if (error.name === 'MongoServerSelectionError') {
      console.error('\n--> Remediation: Could not reach Atlas cluster. Please verify:');
      console.error('    1. MongoDB Atlas Network Access has your current IP address whitelisted (or 0.0.0.0/0 for global dev access).');
      console.error('    2. Your network/firewall permits outbound traffic on port 27017.');
    }
    console.error('====================================================\n');
    process.exitCode = 1;
  } finally {
    await disconnectDB();
  }
};

runVerification();
