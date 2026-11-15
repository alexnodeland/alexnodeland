import { act, render, screen } from '@testing-library/react';
import BackgroundControls from '../../../../components/animated-backgrounds/BackgroundControls';
import { setReadout } from '../../../../components/animated-backgrounds/core/stage/telemetry';
import FieldReadout from '../../../../components/animated-backgrounds/FieldReadout';

jest.mock('../../../../components/animated-backgrounds/index', () => ({
  backgroundRegistry: [{ id: 'one', name: 'One', description: 'First' }],
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

describe('the readout beside the backgrounds’ pill', () => {
  afterEach(() => {
    act(() => setReadout(''));
  });

  it('is not there until a simulation has something to say', () => {
    const { container } = render(<FieldReadout />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the line the simulation wrote, and follows it', () => {
    const { container } = render(<FieldReadout />);
    act(() => setReadout('gen 12 · pop 340 · b3/s23'));
    expect(container.querySelector('.field-readout')).toHaveTextContent(
      'gen 12 · pop 340 · b3/s23'
    );
    act(() => setReadout('gen 13 · pop 352 · b3/s23'));
    expect(container.querySelector('.field-readout')).toHaveTextContent(
      'gen 13'
    );
  });

  it('is kept from a screen reader, which would never stop counting', () => {
    const { container } = render(<FieldReadout />);
    act(() => setReadout('t 0.42'));
    expect(container.querySelector('.field-readout')).toHaveAttribute(
      'aria-hidden',
      'true'
    );
    expect(
      screen.queryByText('t 0.42', { ignore: '[aria-hidden]' })
    ).toBeNull();
  });

  it('sits with the pill, and goes when the settings take its place', () => {
    const controls = (showSettingsPanel: boolean) => (
      <BackgroundControls
        currentBackgroundId="one"
        currentBackgroundName="One"
        showSettingsPanel={showSettingsPanel}
        closingSettingsPanel={false}
        onPreviousBackground={jest.fn()}
        onNextBackground={jest.fn()}
        onToggleSettings={jest.fn()}
      />
    );
    const { container, rerender } = render(controls(false));
    act(() => setReadout('3 waves · k 6.0'));
    const pill = container.querySelector('.background-controls');
    expect(pill?.querySelector('.field-readout')).toHaveTextContent('3 waves');
    // The pill's name is still what the button is called.
    expect(
      screen.getByRole('button', { name: /background settings: one/i })
    ).toBeInTheDocument();

    rerender(controls(true));
    expect(container.querySelector('.field-readout')).toBeNull();
  });
});
