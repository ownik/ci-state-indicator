const request = require("supertest");
const SettingsStorage = require("../src/SettingsStorage");
const { Teamcity } = require("../src/Teamcity");

jest.mock("../src/SettingsStorage");
jest.mock("../src/Teamcity");

const mockSettings = {
  serverUrl: "http://localhost:8112",
  auth: { username: "root", password: "12345" },
  branch: "stable",
  buildTypes: ["Build 1", "Build 2", "Build 3"],
  updateStateInterval: 9999,
};

const mockTeamcityState = {
  items: [
    {
      id: "Build 1",
      displayName: "Build 1",
      investigators: ["user1"],
      running: false,
    },
    {
      id: "Build 2",
      displayName: "Build 2",
      investigators: ["user1"],
      running: false,
    },
  ],
  status: "fail",
};

describe("App", () => {
  test("/settings.json should return settings from SettingsStorage", async () => {
    SettingsStorage.prototype.settings.mockReturnValue(mockSettings);

    expect(SettingsStorage).toHaveBeenCalledTimes(0);
    expect(SettingsStorage.prototype.settings).toHaveBeenCalledTimes(0);

    const app = require("../app");

    expect(SettingsStorage).toHaveBeenCalledTimes(1);
    expect(SettingsStorage).toHaveBeenCalledWith("./settings.json");
    expect(SettingsStorage.prototype.settings).toHaveBeenCalledTimes(1);

    const responce = await request(app).get("/settings.json");

    expect(SettingsStorage).toHaveBeenCalledTimes(1);
    expect(SettingsStorage.prototype.settings).toHaveBeenCalledTimes(2);

    expect(responce.status).toEqual(200);
    expect(responce.body).toEqual(mockSettings);
  });

  test("/state.json should return state from Teamcity", async () => {
    SettingsStorage.prototype.settings.mockReturnValueOnce(mockSettings);
    Teamcity.prototype.checkState.mockResolvedValueOnce(mockTeamcityState);
    const app = require("../app");
    const responce = await request(app).get("/state.json");

    expect(responce.body).toEqual(mockTeamcityState);
    expect(responce.status).toEqual(200);
  });
});