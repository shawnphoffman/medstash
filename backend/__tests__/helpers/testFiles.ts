import fs from 'fs/promises';
import path from 'path';
import { tmpdir } from 'os';

let testReceiptsDir: string | null = null;
let testUploadDir: string | null = null;

/**
 * Setup test file directories
 */
export async function setupTestFiles(): Promise<{ receiptsDir: string; uploadDir: string }> {
  const testDir = path.join(tmpdir(), `medstash-test-${Date.now()}`);
  testReceiptsDir = path.join(testDir, 'receipts');
  testUploadDir = path.join(testDir, 'uploads');

  await fs.mkdir(testReceiptsDir, { recursive: true });
  await fs.mkdir(testUploadDir, { recursive: true });

  // Set environment variables for test
  process.env.RECEIPTS_DIR = testReceiptsDir;

  return { receiptsDir: testReceiptsDir, uploadDir: testUploadDir };
}

/**
 * Cleanup test file directories
 */
export async function cleanupTestFiles(): Promise<void> {
  if (testReceiptsDir) {
    try {
      await fs.rm(path.dirname(testReceiptsDir), { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
    testReceiptsDir = null;
  }
  if (testUploadDir) {
    testUploadDir = null;
  }
  delete process.env.RECEIPTS_DIR;
}

/**
 * Create a test file
 */
export async function createTestFile(
  dir: string,
  filename: string,
  content: string | Buffer = 'test content'
): Promise<string> {
  const filePath = path.join(dir, filename);
  await fs.writeFile(filePath, content);
  return filePath;
}

/**
 * Create a test image file (minimal valid JPEG)
 */
export async function createTestImageFile(
  dir: string,
  filename: string
): Promise<string> {
  // Minimal valid JPEG header
  const jpegHeader = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
  ]);
  return createTestFile(dir, filename, jpegHeader);
}

/**
 * Create a test PDF file (minimal valid PDF)
 */
export async function createTestPdfFile(
  dir: string,
  filename: string
): Promise<string> {
  // Minimal valid PDF header
  const pdfContent = '%PDF-1.4\n%test\n';
  return createTestFile(dir, filename, pdfContent);
}

/**
 * Check if a file exists
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

