// Renderer --> Main (send/on)
export var IpcMessages;
(function (IpcMessages) {
    IpcMessages["SHOW_ERROR_DIALOG"] = "SHOW_ERROR_DIALOG";
    IpcMessages["OPEN_AMONG_US_GAME"] = "OPEN_AMONG_US_GAME";
    IpcMessages["REQUEST_PLATFORMS_AVAILABLE"] = "REQUEST_PLATFORMS_AVAILABLE";
    IpcMessages["RESTART_CREWLINK"] = "RESTART_CREWLINK";
    IpcMessages["QUIT_CREWLINK"] = "QUIT_CREWLINK";
    IpcMessages["SEND_TO_OVERLAY"] = "SEND_TO_OVERLAY";
    IpcMessages["SEND_TO_MAINWINDOW"] = "SEND_TO_MAINWINDOW";
    IpcMessages["RESTART_AND_UPDATE"] = "RESTART_AND_UPDATE";
})(IpcMessages || (IpcMessages = {}));
// Renderer --> Main (sendSync/on)
export var IpcSyncMessages;
(function (IpcSyncMessages) {
    IpcSyncMessages["GET_INITIAL_STATE"] = "GET_INITIAL_STATE";
})(IpcSyncMessages || (IpcSyncMessages = {}));
export var IpcOverlayMessages;
(function (IpcOverlayMessages) {
    IpcOverlayMessages["NOTIFY_GAME_STATE_CHANGED"] = "NOTIFY_GAME_STATE_CHANGED";
    IpcOverlayMessages["NOTIFY_VOICE_STATE_CHANGED"] = "NOTIFY_VOICE_STATE_CHANGED";
    IpcOverlayMessages["NOTIFY_SETTINGS_CHANGED"] = "NOTIFY_SETTINGS_CHANGED";
    IpcOverlayMessages["NOTIFY_PLAYERCOLORS_CHANGED"] = "NOTIFY_PLAYERCOLORS_CHANGED";
    IpcOverlayMessages["REQUEST_INITVALUES"] = "REQUEST_INITVALUES";
})(IpcOverlayMessages || (IpcOverlayMessages = {}));
// Renderer --> Main (invoke/handle)
export var IpcHandlerMessages;
(function (IpcHandlerMessages) {
    IpcHandlerMessages["START_HOOK"] = "START_HOOK";
    IpcHandlerMessages["RESET_KEYHOOKS"] = "RESET_KEYHOOKS";
    IpcHandlerMessages["JOIN_LOBBY"] = "JOIN_LOBBY";
    IpcHandlerMessages["JOIN_LOBBY_ERROR"] = "JOIN_LOBBY_ERROR";
    IpcHandlerMessages["OPEN_LOBBYBROWSER"] = "OPEN_LOBBYBROWSER";
})(IpcHandlerMessages || (IpcHandlerMessages = {}));
// Main --> Renderer (send/on)
export var IpcRendererMessages;
(function (IpcRendererMessages) {
    IpcRendererMessages["NOTIFY_GAME_OPENED"] = "NOTIFY_GAME_OPENED";
    IpcRendererMessages["NOTIFY_GAME_STATE_CHANGED"] = "NOTIFY_GAME_STATE_CHANGED";
    IpcRendererMessages["TOGGLE_DEAFEN"] = "TOGGLE_DEAFEN";
    IpcRendererMessages["TOGGLE_MUTE"] = "TOGGLE_MUTE";
    IpcRendererMessages["PUSH_TO_TALK"] = "PUSH_TO_TALK";
    IpcRendererMessages["IMPOSTOR_RADIO"] = "IMPOSTOR_RADIO";
    IpcRendererMessages["ERROR"] = "ERROR";
    IpcRendererMessages["AUTO_UPDATER_STATE"] = "AUTO_UPDATER_STATE";
})(IpcRendererMessages || (IpcRendererMessages = {}));
//# sourceMappingURL=ipc-messages.js.map