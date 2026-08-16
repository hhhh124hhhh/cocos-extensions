'use strict';

function createSceneEventTools({ createSchema, sceneBridge }) {
  return [
    {
      name: 'list_button_click_events',
      profile: 'full',
      description: '[core] List click event bindings on a Cocos Button component.',
      inputSchema: createSchema(
        {
          path: { type: 'string', description: 'Button node hierarchy path.' },
          uuid: { type: 'string', description: 'Button node uuid.' },
          name: { type: 'string', description: 'Fallback exact button node name.' },
        },
        []
      ),
      handler: async (args) => sceneBridge.call('listButtonClickEvents', args),
    },
    {
      name: 'bind_button_click_event',
      profile: 'full',
      description: '[core] Bind a Cocos Button click event to a target node component method.',
      inputSchema: createSchema(
        {
          path: { type: 'string', description: 'Button node hierarchy path.' },
          uuid: { type: 'string', description: 'Button node uuid.' },
          name: { type: 'string', description: 'Fallback exact button node name.' },
          targetPath: { type: 'string', description: 'Target node path containing the handler component.' },
          targetUuid: { type: 'string', description: 'Target node uuid containing the handler component.' },
          targetName: { type: 'string', description: 'Fallback exact target node name.' },
          componentName: { type: 'string', description: 'Target component class name.' },
          handler: { type: 'string', description: 'Method name to invoke on the target component.' },
          customEventData: { type: 'string', description: 'Optional custom event data string.' },
          replace: { type: 'boolean', description: 'Replace an identical existing binding.' },
        },
        ['componentName', 'handler']
      ),
      handler: async (args) => sceneBridge.call('bindButtonClickEvent', args),
    },
  ];
}

module.exports = {
  createSceneEventTools,
};
