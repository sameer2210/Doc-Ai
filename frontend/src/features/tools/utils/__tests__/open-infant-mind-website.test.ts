import { Alert, Linking } from 'react-native';

import { openInfantMindWebsite } from '../open-infant-mind-website';

describe('openInfantMindWebsite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('opens external infantmind.ai URL when link can be opened', async () => {
    jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(true);
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as never);

    await openInfantMindWebsite();

    expect(Linking.canOpenURL).toHaveBeenCalledWith('https://www.infantmind.ai/');
    expect(Linking.openURL).toHaveBeenCalledWith('https://www.infantmind.ai/');
  });

  it('shows an alert when canOpenURL returns false', async () => {
    jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(false);
    const openSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as never);

    await openInfantMindWebsite();

    expect(Linking.canOpenURL).toHaveBeenCalledWith('https://www.infantmind.ai/');
    expect(openSpy).not.toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalledWith(
      'Unable to Open Link',
      expect.stringContaining('https://www.infantmind.ai/')
    );
  });

  it('shows an error alert when an exception occurs', async () => {
    jest.spyOn(Linking, 'canOpenURL').mockRejectedValue(new Error('Network error'));

    await openInfantMindWebsite();

    expect(Alert.alert).toHaveBeenCalledWith(
      'Error',
      'An unexpected error occurred while trying to open https://www.infantmind.ai/'
    );
  });
});
