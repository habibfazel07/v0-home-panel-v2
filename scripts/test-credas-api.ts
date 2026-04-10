/**
 * Test script to verify Credas API integration
 * Run with: npx ts-node scripts/test-credas-api.ts
 */

const CREDAS_API_KEY = process.env.CREDAS_API_KEY
const CREDAS_BASE_URL = process.env.CREDAS_BASE_URL || "https://portal.credasdemo.com/api"
const CREDAS_AML_JOURNEY_ID = process.env.CREDAS_AML_JOURNEY_ID || "5266c860-f7ec-455b-be7d-7399fc8e11a6"
const CREDAS_AML_ACTOR_ID = process.env.CREDAS_AML_ACTOR_ID || "17"

async function testCredasAPI() {
  console.log("=== Credas API Test ===")
  console.log("Base URL:", CREDAS_BASE_URL)
  console.log("Journey ID:", CREDAS_AML_JOURNEY_ID)
  console.log("Actor ID:", CREDAS_AML_ACTOR_ID)
  console.log("API Key:", CREDAS_API_KEY ? "SET (first 10 chars: " + CREDAS_API_KEY.slice(0, 10) + "...)" : "NOT SET")
  console.log("")

  if (!CREDAS_API_KEY) {
    console.log("ERROR: CREDAS_API_KEY is not set")
    console.log("Please set the following environment variables:")
    console.log("  CREDAS_API_KEY=YTk0MWEzZDktZDkzNS00YjZhLTlmODktZmI2ZWUyOGE3NjIw")
    console.log("  CREDAS_BASE_URL=https://portal.credasdemo.com/api")
    console.log("  CREDAS_AML_JOURNEY_ID=5266c860-f7ec-455b-be7d-7399fc8e11a6")
    console.log("  CREDAS_AML_ACTOR_ID=17")
    return
  }

  // Test 1: List available journeys
  console.log("Test 1: Fetching available journeys...")
  try {
    const journeysRes = await fetch(`${CREDAS_BASE_URL}/v2/ci/journeys`, {
      method: "GET",
      headers: {
        "Authorization": `Basic ${CREDAS_API_KEY}`,
        "Content-Type": "application/json",
      },
    })
    
    if (journeysRes.ok) {
      const journeys = await journeysRes.json()
      console.log("SUCCESS: Found", journeys.length || 0, "journeys")
      if (Array.isArray(journeys)) {
        journeys.forEach((j: { name?: string; id?: string; actorId?: number }) => {
          console.log(`  - ${j.name}: journeyId=${j.id}, actorId=${j.actorId}`)
        })
      }
    } else {
      console.log("FAILED:", journeysRes.status, await journeysRes.text())
    }
  } catch (err) {
    console.log("ERROR:", err)
  }
  
  console.log("")

  // Test 2: Create a test process
  console.log("Test 2: Creating a test process...")
  const testPayload = {
    journeyId: CREDAS_AML_JOURNEY_ID,
    processEntities: [
      {
        actorId: parseInt(CREDAS_AML_ACTOR_ID, 10),
        forename: "Test",
        surname: "User",
        emailAddress: "test@example.com",
        mobileNumber: "07700900000",
      },
    ],
  }
  
  console.log("Payload:", JSON.stringify(testPayload, null, 2))
  
  try {
    const processRes = await fetch(`${CREDAS_BASE_URL}/v2/ci/process`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${CREDAS_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(testPayload),
    })
    
    const responseText = await processRes.text()
    console.log("Response Status:", processRes.status)
    console.log("Response Body:", responseText)
    
    if (processRes.ok) {
      try {
        const data = JSON.parse(responseText)
        console.log("SUCCESS: Process created")
        console.log("  ProcessId:", data.processId || data.ProcessId)
        console.log("  Invite URL:", data.inviteUrl || data.InviteUrl || "Not provided")
      } catch {
        console.log("Response is not JSON")
      }
    } else {
      console.log("FAILED to create process")
    }
  } catch (err) {
    console.log("ERROR:", err)
  }
}

testCredasAPI()
