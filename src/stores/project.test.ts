import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useProjectStore } from './project';
import fc from 'fast-check';

// Mock Tauri invoke
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

import { invoke } from '@tauri-apps/api/core';
const mockInvoke = invoke as ReturnType<typeof vi.fn>;

describe('ProjectStore Property-Based Tests', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  /**
   * **Validates: Requirements 5.7**
   * 
   * Property 9: Token Limit Enforcement
   * 
   * For any context selection, when the total token count exceeds the model's limit,
   * the system SHALL prevent sending the message and display a warning.
   */
  it('Property 9: Token Limit Enforcement - prevents sending when token limit exceeded', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate a model type
        fc.constantFrom('gpt-4', 'gpt-3.5-turbo', 'claude-2', 'llama-2'),
        // Generate a token limit
        fc.integer({ min: 1000, max: 100000 }),
        // Generate a token count that may or may not exceed the limit
        fc.integer({ min: 0, max: 150000 }),
        async (modelType, tokenLimit, actualTokenCount) => {
          const store = useProjectStore();
          
          // Mock the token limit for this model
          mockInvoke.mockImplementation((cmd: string, _args?: any) => {
            if (cmd === 'get_token_limit') {
              return Promise.resolve(tokenLimit);
            }
            if (cmd === 'estimate_tokens_batch') {
              // Return the actual token count we want to test
              return Promise.resolve([actualTokenCount]);
            }
            return Promise.reject(new Error(`Unexpected command: ${cmd}`));
          });

          // Set the token count in the store
          store.tokenCount = actualTokenCount;

          // Check if within limit
          const result = await store.checkTokenLimit(modelType);

          // Verify the property: if token count exceeds limit, withinLimit should be false
          if (actualTokenCount > tokenLimit) {
            expect(result.withinLimit).toBe(false);
            expect(result.tokenCount).toBe(actualTokenCount);
            expect(result.tokenLimit).toBe(tokenLimit);
          } else {
            expect(result.withinLimit).toBe(true);
            expect(result.tokenCount).toBe(actualTokenCount);
            expect(result.tokenLimit).toBe(tokenLimit);
          }

          // Verify that the check is consistent
          expect(result.withinLimit).toBe(actualTokenCount <= tokenLimit);
        }
      ),
      { numRuns: 20 }
    );
  });

  it('Property 9: Token Limit Enforcement - token count accurately reflects selected files', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate an array of files with unique paths
        fc.integer({ min: 1, max: 10 }).chain(count =>
          fc.tuple(...Array.from({ length: count }, (_, i) =>
            fc.record({
              path: fc.constant(`/test/file${i}.txt`), // Unique path for each file
              content: fc.string({ minLength: 0, maxLength: 1000 }),
              tokenCount: fc.integer({ min: 0, max: 1000 }),
            })
          ))
        ),
        async (files) => {
          const store = useProjectStore();
          
          // Reset store state before each test
          store.clearSelection();
          store.tokenCount = 0;

          // Create a map for easier lookup - use path as key since paths are unique
          const fileMap = new Map(files.map(f => [f.path, f]));
          // Also create a map from content to path (for the first occurrence)
          const contentToPathMap = new Map<string, string>();
          for (const file of files) {
            if (!contentToPathMap.has(file.content)) {
              contentToPathMap.set(file.content, file.path);
            }
          }

          // Mock file reading and token estimation
          mockInvoke.mockImplementation((cmd: string, args?: any) => {
            if (cmd === 'read_file') {
              const file = fileMap.get(args.path);
              if (!file) {
                return Promise.reject(new Error(`File not found: ${args.path}`));
              }
              return Promise.resolve(file.content);
            }
            if (cmd === 'estimate_tokens_batch') {
              // The texts array corresponds to the order of files in fileContents (Map preserves insertion order)
              // We need to match each text back to its file by using the path
              const texts = args.texts as string[];
              
              // Get the paths in the order they were inserted into selectedFiles
              const selectedPaths = Array.from(store.selectedFiles);
              
              // Map each text to its corresponding file's token count
              const counts = texts.map((_text: string, index: number) => {
                // Get the path for this index
                const path = selectedPaths[index];
                const file = fileMap.get(path);
                return file?.tokenCount ?? 0;
              });
              
              return Promise.resolve(counts);
            }
            return Promise.reject(new Error(`Unexpected command: ${cmd}`));
          });

          // Select all files
          for (const file of files) {
            try {
              await store.toggleFileSelection(file.path);
            } catch (error) {
              // Ignore errors for invalid files
              console.error(`Failed to select file ${file.path}:`, error);
            }
          }

          // Calculate expected total
          const expectedTotal = files.reduce((sum, file) => sum + file.tokenCount, 0);

          // Verify that the token count matches the sum of all selected files
          expect(store.tokenCount).toBe(expectedTotal);
        }
      ),
      { numRuns: 20 }
    );
  });

  it('Property 9: Token Limit Enforcement - clearing selection resets token count', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            path: fc.string({ minLength: 1, maxLength: 50 }),
            content: fc.string({ minLength: 0, maxLength: 1000 }),
            tokenCount: fc.integer({ min: 1, max: 1000 }),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        async (files) => {
          const store = useProjectStore();

          // Mock file reading and token estimation
          mockInvoke.mockImplementation((cmd: string, args?: any) => {
            if (cmd === 'read_file') {
              const file = files.find(f => f.path === args.path);
              return Promise.resolve(file?.content || '');
            }
            if (cmd === 'estimate_tokens_batch') {
              const texts = args.texts as string[];
              return Promise.resolve(
                texts.map((text: string) => {
                  const file = files.find(f => f.content === text);
                  return file?.tokenCount || 0;
                })
              );
            }
            return Promise.reject(new Error(`Unexpected command: ${cmd}`));
          });

          // Select all files
          for (const file of files) {
            try {
              await store.toggleFileSelection(file.path);
            } catch (error) {
              // Ignore errors
            }
          }

          // Token count should be greater than 0 if we selected files
          const tokenCountBeforeClear = store.tokenCount;
          if (files.length > 0) {
            expect(tokenCountBeforeClear).toBeGreaterThan(0);
          }

          // Clear selection
          store.clearSelection();

          // Verify that token count is reset to 0
          expect(store.tokenCount).toBe(0);
          expect(store.selectedFiles.size).toBe(0);
          expect(store.fileContents.size).toBe(0);
        }
      ),
      { numRuns: 20 }
    );
  });

  it('Property 9: Token Limit Enforcement - deselecting files reduces token count', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            path: fc.string({ minLength: 1, maxLength: 50 }),
            content: fc.string({ minLength: 0, maxLength: 1000 }),
            tokenCount: fc.integer({ min: 1, max: 1000 }),
          }),
          { minLength: 2, maxLength: 10 }
        ),
        async (files) => {
          const store = useProjectStore();

          // Mock file reading and token estimation
          mockInvoke.mockImplementation((cmd: string, args?: any) => {
            if (cmd === 'read_file') {
              const file = files.find(f => f.path === args.path);
              return Promise.resolve(file?.content || '');
            }
            if (cmd === 'estimate_tokens_batch') {
              const texts = args.texts as string[];
              return Promise.resolve(
                texts.map((text: string) => {
                  const file = files.find(f => f.content === text);
                  return file?.tokenCount || 0;
                })
              );
            }
            return Promise.reject(new Error(`Unexpected command: ${cmd}`));
          });

          // Select all files
          for (const file of files) {
            try {
              await store.toggleFileSelection(file.path);
            } catch (error) {
              // Ignore errors
            }
          }

          const tokenCountAfterSelectAll = store.tokenCount;

          // Deselect the first file
          const firstFile = files[0];
          await store.toggleFileSelection(firstFile.path);

          const tokenCountAfterDeselect = store.tokenCount;

          // Verify that token count decreased by the first file's token count
          expect(tokenCountAfterDeselect).toBe(
            tokenCountAfterSelectAll - firstFile.tokenCount
          );
        }
      ),
      { numRuns: 20 }
    );
  });
});
