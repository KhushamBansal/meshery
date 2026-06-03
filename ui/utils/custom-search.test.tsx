import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';

vi.mock('@sistent/sistent', () => {
  const React = require('react');

  const styled = (Component) => {
    return () => (props) => React.createElement(Component, props);
  };

  const TextField = React.forwardRef(({ inputProps, ...props }, ref) => (
    <input ref={ref} data-testid="search-input" {...props} />
  ));

  const IconButton = React.forwardRef(({ children, ...props }, ref) => (
    <button ref={ref} type="button" {...props}>
      {children}
    </button>
  ));

  const ClickAwayListener = ({ children }) => children;
  const CloseIcon = () => <span data-testid="close-icon" />;
  const SearchIcon = () => <span data-testid="search-icon" />;

  const CustomTooltip = ({ children }) => <>{children}</>;

  return {
    styled,
    TextField,
    IconButton,
    ClickAwayListener,
    CloseIcon,
    SearchIcon,
    CustomTooltip,
    useTheme: () => ({
      palette: {
        icon: { secondary: '#000' },
        background: { paper: '#fff' },
      },
    }),
  };
});

vi.mock('./debounce', () => ({ default: (fn) => fn }));

import SearchBar from './custom-search';

describe('custom-search', () => {
  it('syncs internal input value when parent value changes', () => {
    const onSearch = vi.fn();
    const setExpanded = vi.fn();

    const { rerender } = render(
      <SearchBar
        value="initial"
        onSearch={onSearch}
        expanded={false}
        setExpanded={setExpanded}
        setModelsFilters={vi.fn()}
      />,
    );

    rerender(
      <SearchBar
        value="updated"
        onSearch={onSearch}
        expanded={false}
        setExpanded={setExpanded}
        setModelsFilters={vi.fn()}
      />,
    );

    expect(screen.getByTestId('search-input')).toHaveValue('updated');
  });

  it('clears search state and notifies parent when closing search', () => {
    const onSearch = vi.fn();
    const setExpanded = vi.fn();
    const setModelsFilters = vi.fn();

    render(
      <SearchBar
        value="query"
        onSearch={onSearch}
        expanded={true}
        setExpanded={setExpanded}
        setModelsFilters={setModelsFilters}
      />,
    );

    fireEvent.click(screen.getByRole('button'));

    expect(setModelsFilters).toHaveBeenCalledWith({ page: 0 });
    expect(onSearch).toHaveBeenCalledWith(null);
    expect(setExpanded).toHaveBeenCalledWith(false);
  });
});
