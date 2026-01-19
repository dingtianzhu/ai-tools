import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import DiffView from './DiffView.vue';

describe('DiffView', () => {
  const originalContent = `function hello() {
  console.log("Hello");
}`;

  const modifiedContent = `function hello() {
  console.log("Hello, World!");
  return true;
}`;

  describe('Component Rendering', () => {
    it('should render the component with file path', () => {
      const wrapper = mount(DiffView, {
        props: {
          filePath: 'src/test.ts',
          originalContent,
          modifiedContent
        }
      });

      expect(wrapper.find('.file-path').text()).toBe('src/test.ts');
    });

    it('should display change type badge', () => {
      const wrapper = mount(DiffView, {
        props: {
          filePath: 'src/test.ts',
          originalContent,
          modifiedContent,
          changeType: 'modify'
        }
      });

      const badge = wrapper.find('.change-type-badge');
      expect(badge.exists()).toBe(true);
      expect(badge.text()).toBe('modify');
    });

    it('should render side-by-side view by default', () => {
      const wrapper = mount(DiffView, {
        props: {
          filePath: 'src/test.ts',
          originalContent,
          modifiedContent
        }
      });

      expect(wrapper.find('.side-by-side-view').exists()).toBe(true);
      expect(wrapper.find('.unified-view').exists()).toBe(false);
    });

    it('should render unified view when mode is unified', () => {
      const wrapper = mount(DiffView, {
        props: {
          filePath: 'src/test.ts',
          originalContent,
          modifiedContent,
          mode: 'unified'
        }
      });

      expect(wrapper.find('.unified-view').exists()).toBe(true);
      expect(wrapper.find('.side-by-side-view').exists()).toBe(false);
    });
  });

  describe('Change Type Badge Styling', () => {
    it('should apply correct class for create change type', () => {
      const wrapper = mount(DiffView, {
        props: {
          filePath: 'src/test.ts',
          originalContent: '',
          modifiedContent,
          changeType: 'create'
        }
      });

      const badge = wrapper.find('.change-type-badge');
      expect(badge.classes()).toContain('bg-green-100');
    });

    it('should apply correct class for delete change type', () => {
      const wrapper = mount(DiffView, {
        props: {
          filePath: 'src/test.ts',
          originalContent,
          modifiedContent: '',
          changeType: 'delete'
        }
      });

      const badge = wrapper.find('.change-type-badge');
      expect(badge.classes()).toContain('bg-red-100');
    });

    it('should apply correct class for modify change type', () => {
      const wrapper = mount(DiffView, {
        props: {
          filePath: 'src/test.ts',
          originalContent,
          modifiedContent,
          changeType: 'modify'
        }
      });

      const badge = wrapper.find('.change-type-badge');
      expect(badge.classes()).toContain('bg-blue-100');
    });
  });

  describe('Action Buttons', () => {
    it('should render all action buttons', () => {
      const wrapper = mount(DiffView, {
        props: {
          filePath: 'src/test.ts',
          originalContent,
          modifiedContent
        }
      });

      expect(wrapper.find('.edit-btn').exists()).toBe(true);
      expect(wrapper.find('.reject-btn').exists()).toBe(true);
      expect(wrapper.find('.approve-btn').exists()).toBe(true);
    });

    it('should emit approve event when approve button is clicked', async () => {
      const wrapper = mount(DiffView, {
        props: {
          filePath: 'src/test.ts',
          originalContent,
          modifiedContent
        }
      });

      await wrapper.find('.approve-btn').trigger('click');
      expect(wrapper.emitted('approve')).toBeTruthy();
      expect(wrapper.emitted('approve')?.length).toBe(1);
    });

    it('should emit reject event when reject button is clicked', async () => {
      const wrapper = mount(DiffView, {
        props: {
          filePath: 'src/test.ts',
          originalContent,
          modifiedContent
        }
      });

      await wrapper.find('.reject-btn').trigger('click');
      expect(wrapper.emitted('reject')).toBeTruthy();
      expect(wrapper.emitted('reject')?.length).toBe(1);
    });

    it('should enter edit mode when edit button is clicked', async () => {
      const wrapper = mount(DiffView, {
        props: {
          filePath: 'src/test.ts',
          originalContent,
          modifiedContent
        }
      });

      await wrapper.find('.edit-btn').trigger('click');
      expect(wrapper.find('.edit-mode').exists()).toBe(true);
      expect(wrapper.find('.edit-textarea').exists()).toBe(true);
    });
  });

  describe('Edit Mode', () => {
    it('should show textarea in edit mode', async () => {
      const wrapper = mount(DiffView, {
        props: {
          filePath: 'src/test.ts',
          originalContent,
          modifiedContent
        }
      });

      await wrapper.find('.edit-btn').trigger('click');
      
      const textarea = wrapper.find('.edit-textarea');
      expect(textarea.exists()).toBe(true);
      expect((textarea.element as HTMLTextAreaElement).value).toBe(modifiedContent);
    });

    it('should emit edit event with new content when save is clicked', async () => {
      const wrapper = mount(DiffView, {
        props: {
          filePath: 'src/test.ts',
          originalContent,
          modifiedContent
        }
      });

      // Enter edit mode
      await wrapper.find('.edit-btn').trigger('click');
      
      // Modify content
      const newContent = 'function hello() {\n  console.log("Modified!");\n}';
      const textarea = wrapper.find('.edit-textarea');
      await textarea.setValue(newContent);
      
      // Save
      await wrapper.find('.approve-btn').trigger('click');
      
      expect(wrapper.emitted('edit')).toBeTruthy();
      expect(wrapper.emitted('edit')?.[0]).toEqual([newContent]);
    });

    it('should cancel edit mode when cancel button is clicked', async () => {
      const wrapper = mount(DiffView, {
        props: {
          filePath: 'src/test.ts',
          originalContent,
          modifiedContent
        }
      });

      // Enter edit mode
      await wrapper.find('.edit-btn').trigger('click');
      expect(wrapper.find('.edit-mode').exists()).toBe(true);
      
      // Cancel
      await wrapper.find('.reject-btn').trigger('click');
      expect(wrapper.find('.edit-mode').exists()).toBe(false);
      expect(wrapper.emitted('reject')).toBeFalsy();
    });

    it('should hide diff view in edit mode', async () => {
      const wrapper = mount(DiffView, {
        props: {
          filePath: 'src/test.ts',
          originalContent,
          modifiedContent
        }
      });

      await wrapper.find('.edit-btn').trigger('click');
      expect(wrapper.find('.diff-content').exists()).toBe(false);
    });
  });

  describe('Diff Display - Side-by-Side', () => {
    it('should display both original and modified panes', () => {
      const wrapper = mount(DiffView, {
        props: {
          filePath: 'src/test.ts',
          originalContent,
          modifiedContent,
          mode: 'side-by-side'
        }
      });

      const panes = wrapper.findAll('.diff-pane');
      expect(panes.length).toBe(2);
      
      const headers = wrapper.findAll('.pane-header');
      expect(headers[0].text()).toBe('Original');
      expect(headers[1].text()).toBe('Modified');
    });

    it('should show line numbers in both panes', () => {
      const wrapper = mount(DiffView, {
        props: {
          filePath: 'src/test.ts',
          originalContent,
          modifiedContent,
          mode: 'side-by-side'
        }
      });

      const lineNumbers = wrapper.findAll('.line-number');
      expect(lineNumbers.length).toBeGreaterThan(0);
    });

    it('should highlight added lines in green', () => {
      const wrapper = mount(DiffView, {
        props: {
          filePath: 'src/test.ts',
          originalContent: 'line1',
          modifiedContent: 'line1\nline2',
          mode: 'side-by-side'
        }
      });

      const addedLines = wrapper.findAll('.code-line').filter(w => 
        w.classes().includes('bg-green-50')
      );
      expect(addedLines.length).toBeGreaterThan(0);
    });

    it('should highlight removed lines in red', () => {
      const wrapper = mount(DiffView, {
        props: {
          filePath: 'src/test.ts',
          originalContent: 'line1\nline2',
          modifiedContent: 'line1',
          mode: 'side-by-side'
        }
      });

      const removedLines = wrapper.findAll('.code-line').filter(w => 
        w.classes().includes('bg-red-50')
      );
      expect(removedLines.length).toBeGreaterThan(0);
    });
  });

  describe('Diff Display - Unified', () => {
    it('should display unified diff view', () => {
      const wrapper = mount(DiffView, {
        props: {
          filePath: 'src/test.ts',
          originalContent,
          modifiedContent,
          mode: 'unified'
        }
      });

      expect(wrapper.find('.unified-view').exists()).toBe(true);
      expect(wrapper.find('.code-lines').exists()).toBe(true);
    });

    it('should show both original and modified line numbers', () => {
      const wrapper = mount(DiffView, {
        props: {
          filePath: 'src/test.ts',
          originalContent,
          modifiedContent,
          mode: 'unified'
        }
      });

      const lineNumbers = wrapper.findAll('.line-number');
      const originalNumbers = lineNumbers.filter(w => w.classes().includes('original'));
      const modifiedNumbers = lineNumbers.filter(w => w.classes().includes('modified'));
      
      expect(originalNumbers.length).toBeGreaterThan(0);
      expect(modifiedNumbers.length).toBeGreaterThan(0);
    });

    it('should show + prefix for added lines', () => {
      const wrapper = mount(DiffView, {
        props: {
          filePath: 'src/test.ts',
          originalContent: 'line1',
          modifiedContent: 'line1\nline2',
          mode: 'unified'
        }
      });

      const prefixes = wrapper.findAll('.line-prefix');
      const plusPrefixes = prefixes.filter(w => w.text() === '+');
      expect(plusPrefixes.length).toBeGreaterThan(0);
    });

    it('should show - prefix for removed lines', () => {
      const wrapper = mount(DiffView, {
        props: {
          filePath: 'src/test.ts',
          originalContent: 'line1\nline2',
          modifiedContent: 'line1',
          mode: 'unified'
        }
      });

      const prefixes = wrapper.findAll('.line-prefix');
      const minusPrefixes = prefixes.filter(w => w.text() === '-');
      expect(minusPrefixes.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty original content', () => {
      const wrapper = mount(DiffView, {
        props: {
          filePath: 'src/test.ts',
          originalContent: '',
          modifiedContent: 'new content',
          changeType: 'create'
        }
      });

      expect(wrapper.find('.diff-view').exists()).toBe(true);
    });

    it('should handle empty modified content', () => {
      const wrapper = mount(DiffView, {
        props: {
          filePath: 'src/test.ts',
          originalContent: 'old content',
          modifiedContent: '',
          changeType: 'delete'
        }
      });

      expect(wrapper.find('.diff-view').exists()).toBe(true);
    });

    it('should handle identical content', () => {
      const content = 'same content';
      const wrapper = mount(DiffView, {
        props: {
          filePath: 'src/test.ts',
          originalContent: content,
          modifiedContent: content
        }
      });

      expect(wrapper.find('.diff-view').exists()).toBe(true);
      const unchangedLines = wrapper.findAll('.code-line').filter(w => 
        w.classes().includes('bg-white') || w.classes().includes('dark:bg-gray-800')
      );
      expect(unchangedLines.length).toBeGreaterThan(0);
    });

    it('should handle multiline content', () => {
      const multiline = 'line1\nline2\nline3\nline4\nline5';
      const wrapper = mount(DiffView, {
        props: {
          filePath: 'src/test.ts',
          originalContent: multiline,
          modifiedContent: multiline + '\nline6'
        }
      });

      const lines = wrapper.findAll('.code-line');
      expect(lines.length).toBeGreaterThan(5);
    });

    it('should handle special characters in content', () => {
      const specialContent = 'function test() {\n  return "<>&\'";\n}';
      const wrapper = mount(DiffView, {
        props: {
          filePath: 'src/test.ts',
          originalContent: specialContent,
          modifiedContent: specialContent
        }
      });

      expect(wrapper.find('.diff-view').exists()).toBe(true);
    });
  });

  describe('Requirements Validation', () => {
    it('should validate Requirement 6.5: Display Diff_View showing proposed changes', () => {
      const wrapper = mount(DiffView, {
        props: {
          filePath: 'src/example.ts',
          originalContent: 'const x = 1;',
          modifiedContent: 'const x = 2;',
          changeType: 'modify'
        }
      });

      // Should display file path
      expect(wrapper.find('.file-path').text()).toBe('src/example.ts');
      
      // Should display change type
      expect(wrapper.find('.change-type-badge').text()).toBe('modify');
      
      // Should display diff content
      expect(wrapper.find('.diff-content').exists()).toBe(true);
      
      // Should show both original and modified content
      const lines = wrapper.findAll('.code-line');
      expect(lines.length).toBeGreaterThan(0);
    });

    it('should validate Requirement 6.6: Apply modifications when user approves', async () => {
      const wrapper = mount(DiffView, {
        props: {
          filePath: 'src/example.ts',
          originalContent: 'const x = 1;',
          modifiedContent: 'const x = 2;',
          changeType: 'modify'
        }
      });

      // Click approve button
      await wrapper.find('.approve-btn').trigger('click');
      
      // Should emit approve event
      expect(wrapper.emitted('approve')).toBeTruthy();
      expect(wrapper.emitted('approve')?.length).toBe(1);
    });

    it('should validate Requirement 6.7: Discard modifications when user rejects', async () => {
      const wrapper = mount(DiffView, {
        props: {
          filePath: 'src/example.ts',
          originalContent: 'const x = 1;',
          modifiedContent: 'const x = 2;',
          changeType: 'modify'
        }
      });

      // Click reject button
      await wrapper.find('.reject-btn').trigger('click');
      
      // Should emit reject event
      expect(wrapper.emitted('reject')).toBeTruthy();
      expect(wrapper.emitted('reject')?.length).toBe(1);
    });

    it('should support editing proposed changes', async () => {
      const wrapper = mount(DiffView, {
        props: {
          filePath: 'src/example.ts',
          originalContent: 'const x = 1;',
          modifiedContent: 'const x = 2;',
          changeType: 'modify'
        }
      });

      // Enter edit mode
      await wrapper.find('.edit-btn').trigger('click');
      expect(wrapper.find('.edit-textarea').exists()).toBe(true);
      
      // Modify content
      const newContent = 'const x = 3;';
      await wrapper.find('.edit-textarea').setValue(newContent);
      
      // Save changes
      await wrapper.find('.approve-btn').trigger('click');
      
      // Should emit edit event with new content
      expect(wrapper.emitted('edit')).toBeTruthy();
      expect(wrapper.emitted('edit')?.[0]).toEqual([newContent]);
    });

    it('should support both side-by-side and unified views', () => {
      // Side-by-side view
      const sideBySideWrapper = mount(DiffView, {
        props: {
          filePath: 'src/test.ts',
          originalContent: 'line1',
          modifiedContent: 'line2',
          mode: 'side-by-side'
        }
      });
      expect(sideBySideWrapper.find('.side-by-side-view').exists()).toBe(true);

      // Unified view
      const unifiedWrapper = mount(DiffView, {
        props: {
          filePath: 'src/test.ts',
          originalContent: 'line1',
          modifiedContent: 'line2',
          mode: 'unified'
        }
      });
      expect(unifiedWrapper.find('.unified-view').exists()).toBe(true);
    });

    it('should display file path and change type', () => {
      const wrapper = mount(DiffView, {
        props: {
          filePath: 'src/components/Example.vue',
          originalContent: 'old',
          modifiedContent: 'new',
          changeType: 'modify'
        }
      });

      expect(wrapper.find('.file-path').text()).toBe('src/components/Example.vue');
      expect(wrapper.find('.change-type-badge').text()).toBe('modify');
    });

    it('should use appropriate styling for additions and deletions', () => {
      const wrapper = mount(DiffView, {
        props: {
          filePath: 'src/test.ts',
          originalContent: 'line1\nline2',
          modifiedContent: 'line1\nline3',
          mode: 'unified'
        }
      });

      // Check for red styling on removed lines
      const removedLines = wrapper.findAll('.code-line').filter(w => 
        w.classes().includes('bg-red-50') || w.classes().includes('dark:bg-red-900/20')
      );
      expect(removedLines.length).toBeGreaterThan(0);

      // Check for green styling on added lines
      const addedLines = wrapper.findAll('.code-line').filter(w => 
        w.classes().includes('bg-green-50') || w.classes().includes('dark:bg-green-900/20')
      );
      expect(addedLines.length).toBeGreaterThan(0);
    });
  });
});
