import { fireEvent, render, screen } from '@testing-library/react';
import SettingsPanel from '../../../../components/animated-backgrounds/SettingsPanel';

describe('SettingsPanel', () => {
  const settings = {
    opacity: 0.8,
    elementSize: 0.02,
    globalTimeMultiplier: 1,
    customNumber: 5,
    colors: { primary: [1, 0, 0] },
  } as any;

  const schema = [
    {
      key: 'customNumber',
      label: 'Number',
      type: 'number',
      category: 'Custom',
    },
    {
      key: 'colors.primary',
      label: 'Primary',
      type: 'color',
      category: 'Colors',
    },
  ] as any;

  it('renders and triggers onClose', () => {
    const onClose = jest.fn();
    render(
      <SettingsPanel
        settings={settings}
        settingsSchema={schema}
        onSettingsChange={jest.fn()}
        onClose={onClose}
        currentBackgroundId="one"
        currentBackgroundName="One"
        currentBackgroundDescription="desc"
        totalBackgrounds={2}
        onPreviousBackground={jest.fn()}
        onNextBackground={jest.fn()}
        isClosing={false}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Close settings' }));
    expect(onClose).toHaveBeenCalled();
  });
});
