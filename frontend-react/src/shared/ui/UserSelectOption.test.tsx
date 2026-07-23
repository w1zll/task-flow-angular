import { render, screen } from '@testing-library/react';
import UserSelectOption from './UserSelectOption';

describe('UserSelectOption', () => {
  it('renders avatar, primary label and optional secondary text', () => {
    render(
      <UserSelectOption
        name="Alex Morgan"
        avatar="https://example.com/alex.png"
        secondary="alex@example.com"
      />,
    );

    expect(screen.getByAltText('Alex Morgan')).not.toBeNull();
    expect(screen.getByText('Alex Morgan')).not.toBeNull();
    expect(screen.getByText('alex@example.com')).not.toBeNull();
  });
});
