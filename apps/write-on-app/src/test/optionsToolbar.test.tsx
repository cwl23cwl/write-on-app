import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

import { OptionsToolbar } from '@/components/chrome/OptionsToolbar';
import { useToolbarStore } from '@/state/useToolbarStore';

describe('OptionsToolbar panel switching', () => {
  beforeEach(() => {
    // reset store between tests
    useToolbarStore.setState({ activeTool: 'none' });
  });

  it('renders no text panel when not in Text mode', () => {
    useToolbarStore.setState({ activeTool: 'select' });
    render(<OptionsToolbar />);
    expect(screen.getByRole('complementary')).to.exist;
    expect(document.querySelector('.chrome-text-options-panel')).to.equal(null);
  });

  it('renders TextOptionsPanel when Text tool is active', () => {
    useToolbarStore.setState({ activeTool: 'text' });
    render(<OptionsToolbar />);
    expect(document.querySelector('.chrome-text-options-panel')).not.to.equal(null);
  });
});
