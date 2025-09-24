import { render, screen } from '@testing-library/react';
import BackgroundControls from '../../../../components/animated-backgrounds/BackgroundControls';

jest.mock('../../../../components/animated-backgrounds/index', () => ({
  backgroundRegistry: [
    { id: 'one', name: 'One', description: 'First' },
    { id: 'two', name: 'Two', description: 'Second' },
  ],
}));

jest.mock('../../../../components/SettingsPanelContext', () => ({
  useSettingsPanel: () => ({
    isSettingsPanelOpen: false,
    isClosingSettingsPanel: false,
  }),
}));

jest.mock('../../../../components/animated-backgrounds/SettingsPanel', () => {
  return function MockPanel() {
    return <div data-testid="settings-panel" />;
  };
});

describe('BackgroundControls', () => {
  it('renders toolbar when panel hidden', () => {
    render(
      <BackgroundControls
        currentBackgroundId="one"
        currentBackgroundName="One"
        showSettingsPanel={false}
        closingSettingsPanel={false}
        onPreviousBackground={jest.fn()}
        onNextBackground={jest.fn()}
        onToggleSettings={jest.fn()}
      />
    );
    expect(screen.getByText('one')).toBeInTheDocument();
  });
});
