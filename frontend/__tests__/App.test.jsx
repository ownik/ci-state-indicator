import React from 'react';
import { shallow, mount } from 'enzyme';
import mockAxios from 'axios';
import App from '../src/App';

import LightIndicatorScreen from '../src/LightIndicatorScreen';
import TimerLabel from '../src/TimerLabel';

jest.mock('axios', () => ({
  get: jest.fn().mockImplementation(() => Promise.resolve({ data: {} })),
}));

describe('App', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic App tests', () => {
    let wrapper;

    afterEach(() => {
      if (wrapper) wrapper.unmount();
    });

    test('expected first element is LightIndicatorScreen', () => {
      wrapper = shallow(<App />);
      expect(wrapper.type()).toBe(LightIndicatorScreen);
    });

    test.each`
      text                     | checkStateResultItems               | checkStateResultStatus
      ${'one build - success'} | ${['Build Type 1']}                 | ${'success'}
      ${'two builds - fail'}   | ${['Build Type 2', 'Build Type 1']} | ${'fail'}
    `(
      'State changing $text',
      async ({ checkStateResultItems, checkStateResultStatus }) => {
        const checkStateResult = {
          items: checkStateResultItems,
          status: checkStateResultStatus,
        };

        wrapper = shallow(<App />, { disableLifecycleMethods: true });
        wrapper.setState({ checkStateResult });

        const lightScreenIndicator = wrapper.find(LightIndicatorScreen);
        expect(lightScreenIndicator.props()).toHaveProperty(
          'items',
          checkStateResultItems
        );
        expect(lightScreenIndicator.props()).toHaveProperty(
          'status',
          checkStateResultStatus
        );
        const timerLabel = wrapper.find(TimerLabel);
        expect(timerLabel.props()).toHaveProperty(
          'status',
          checkStateResultStatus
        );
      }
    );

    test('manualy call fetch settings with mocked axios', async () => {
      const settings = { test: true, string: 'some string' };

      mockAxios.get.mockImplementationOnce(() => Promise.resolve(settings));

      const wrapper = shallow(<App />, { disableLifecycleMethods: true });

      expect(mockAxios.get).toHaveBeenCalledTimes(0);

      await expect(wrapper.instance().fetchSettings()).resolves.toEqual(
        settings
      );

      expect(mockAxios.get).toHaveBeenCalledTimes(1);

      expect(mockAxios.get).toHaveBeenCalledWith('/settings.json');
    });

    test('manualy call fetch state with mocked axios', async () => {
      const state = {
        items: ['Build 1', 'Build 2'],
        status: 'fail',
        lastChangedStatusTime: Date.now(),
      };

      mockAxios.get.mockImplementationOnce(() => Promise.resolve(state));

      const wrapper = shallow(<App />, { disableLifecycleMethods: true });

      expect(mockAxios.get).toHaveBeenCalledTimes(0);

      await expect(wrapper.instance().fetchState()).resolves.toEqual(state);

      expect(mockAxios.get).toHaveBeenCalledTimes(1);

      expect(mockAxios.get).toHaveBeenCalledWith('/state.json');
    });
  });

  describe('Settings read', () => {
    let updateStateMock;
    let app;

    beforeEach(() => {
      jest.useFakeTimers();
      mockAxios.get.mockClear();
      App.prototype.fetchSettings = jest.fn();
      App.prototype.fetchState = jest.fn();
      updateStateMock = jest.spyOn(App.prototype, 'updateState');
    });

    afterEach(() => {
      if (app) app.unmount();
      App.prototype.fetchSettings.mockRestore();
      App.prototype.fetchState.mockRestore();
      updateStateMock.mockRestore();
      jest.useRealTimers();
    });

    test('should call fetchSettings, connect, setInterval and updateState during componentDidMount \
    and call clearInterval in componentWillUnmount', (done) => {
      const lastChangedStatusTime = Date.now();
      const mockSettings = {
        serverUrl: 'http://localhost:8080',
        auth: { user: 'root', password: '123456' },
        branch: 'default',
        buildTypes: ['Build Type 1', 'Build Type 2', 'Build Type 3'],
        lastChangedStatusTime,
      };
      const checkStateResult = {
        items: ['Build Type 1'],
        status: 'success',
      };
      App.prototype.fetchState.mockResolvedValueOnce({
        data: { ...checkStateResult, lastChangedStatusTime },
      });
      App.prototype.fetchSettings.mockResolvedValueOnce({
        data: mockSettings,
      });

      app = shallow(<App />);

      setImmediate(() => {
        expect(App.prototype.fetchSettings).toHaveBeenCalledTimes(1);
        expect(App.prototype.fetchState).toHaveBeenCalledTimes(1);
        expect(updateStateMock).toHaveBeenCalledTimes(1);
        expect(app.state()).toHaveProperty(
          'checkStateResult',
          checkStateResult
        );
        expect(app.state()).toHaveProperty(
          'lastChangedStatusTime',
          lastChangedStatusTime
        );
        expect(setInterval).toHaveBeenCalledTimes(1);
        app.unmount();
        expect(clearInterval).toHaveBeenCalledTimes(1);
        done();
      });
    });

    test('check updateState interval 5000ms', (done) => {
      const settings = {
        updateStateInterval: 5000,
        lastChangedStatusTime: Date.now(),
      };

      App.prototype.fetchSettings.mockResolvedValue({
        data: settings,
      });

      App.prototype.fetchState.mockResolvedValue({
        data: { lastChangedStatusTime: settings.lastChangedStatusTime },
      });

      app = shallow(<App />);

      setImmediate(() => {
        expect(updateStateMock).toHaveBeenCalledTimes(1);
        jest.advanceTimersByTime(1000);
        expect(updateStateMock).toHaveBeenCalledTimes(1);
        jest.advanceTimersByTime(5000);
        expect(updateStateMock).toHaveBeenCalledTimes(2);
        jest.advanceTimersByTime(50000);
        expect(updateStateMock).toHaveBeenCalledTimes(12);
        done();
      });
    });

    test('check updateState interval 30000ms', (done) => {
      const settings = {
        updateStateInterval: 30000,
        lastChangedStatusTime: Date.now(),
      };

      App.prototype.fetchSettings.mockResolvedValue({
        data: settings,
      });

      App.prototype.fetchState.mockResolvedValue({
        data: { lastChangedStatusTime: settings.lastChangedStatusTime },
      });

      app = shallow(<App />);

      setImmediate(() => {
        expect(updateStateMock).toHaveBeenCalledTimes(1);
        jest.advanceTimersByTime(1000);
        expect(updateStateMock).toHaveBeenCalledTimes(1);
        jest.advanceTimersByTime(5000);
        expect(updateStateMock).toHaveBeenCalledTimes(1);
        jest.advanceTimersByTime(50000);
        expect(updateStateMock).toHaveBeenCalledTimes(2);
        done();
      });
    });

    test('read settings in componentDidMount', (done) => {
      const settings = { test: true, string: 'some string' };

      App.prototype.fetchSettings.mockResolvedValue({
        data: settings,
      });

      App.prototype.fetchState.mockResolvedValue({
        data: { lastChangedStatusTime: settings.lastChangedStatusTime },
      });

      const wrapper = shallow(<App />);

      setImmediate(() => {
        expect(wrapper.instance().settings).toEqual(settings);
        done();
      });
    });
  });

  describe('TimerLabel integration', () => {
    let wrapper;
    let timerLabel;
    let timerEventMock;

    beforeAll(() => {
      jest.useFakeTimers();
      Date.now = jest
        .fn()
        .mockReturnValue(new Date(2020, 4, 8, 20, 10, 30).getTime());
      App.prototype.fetchSettings = jest.fn().mockResolvedValue({
        data: { lastChangedStatusTime: Date.now() },
      });
      App.prototype.fetchState = jest.fn().mockResolvedValue({
        data: { lastChangedStatusTime: Date.now() },
      });
      wrapper = mount(<App />);
      timerLabel = wrapper.find(TimerLabel);
    });

    afterAll(() => {
      timerEventMock.mockRestore();
      App.prototype.fetchSettings.mockRestore();
      App.prototype.fetchState.mockRestore();
      Date.now.mockRestore();
      jest.useRealTimers();
      wrapper.unmount();
    });

    beforeEach(() => {
      timerEventMock = jest.spyOn(wrapper.instance(), 'timerEvent');
    });

    afterEach(() => {
      timerEventMock.mockClear();
    });

    test('exist single TimerLabel', () => {
      expect(timerLabel).toHaveLength(1);
    });

    test('TimerLabel text is 00:00:00', () => {
      expect(timerLabel.text()).toEqual('00:00:00');
    });

    test('TimerLabel text is nowDate', () => {
      expect(timerLabel.props()).toHaveProperty('time', Date.now());
    });

    test('advance timers by 1000ms with nowDate changing cause update of TimerLabel text', () => {
      Date.now = Date.now.mockReturnValue(
        new Date(2020, 4, 8, 21, 12, 33).getTime()
      );
      jest.advanceTimersByTime(1000);
      expect(timerLabel.text()).toEqual('01:02:03');
    });

    test('advance timers by 5000ms cause calling timerEvent 5 times', () => {
      jest.advanceTimersByTime(5000);
      expect(timerEventMock).toHaveBeenCalledTimes(5);
    });
  });
});
