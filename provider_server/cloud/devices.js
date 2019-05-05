exports.DEVICES = [
  {
    id: 'Cookie',
    type: 'action.devices.types.LOCK',
    traits: ['action.devices.traits.LockUnlock'],
    name: {
      name: 'Cookie Jar',
    },
    willReportState: true,
  },
  {
    id: 'Sprinkler',
    type: 'action.devices.types.SPRINKLER',
    traits: ['action.devices.traits.StartStop'],
    name: {
      name: 'Sprinkler',
    },
    willReportState: true,
    attributes: {
      pausable: true,
      availableZones: ['basil', 'mint', 'parsley', 'left side', 'right side'],
    },
  },
  {
    id: 'Garden',
    type: 'action.devices.types.LIGHT',
    traits: [
      'action.devices.traits.Brightness',
      'action.devices.traits.Rotation',
      'action.devices.traits.HumiditySetting',
      'action.devices.traits.Dispense',
      'action.devices.traits.OnOff',
    ],
    name: {
      name: 'Garden',
    },
    willReportState: true,
    attributes: {
      supportsDegrees: true,
      supportsPercent: true,
      rotationDegreesRange: {
        rotationDegreesMin: 0.0,
        rotationDegreesMax: 360.0,
      },
      pausable: true,
      supportedDispenseItems: [
        {
          item_name: 'water',
          item_name_synonyms: [
            {
              lang: 'en',
              synonyms: ['water'],
            },
          ],
          supported_units: [
            'TEASPOONS',
            'TABLESPOONS',
            'FLUID_OUNCES',
            'CUPS',
            'PINTS',
            'QUARTS',
            'GALLONS',
            'MILLILITERS',
            'LITERS',
            'DECILITERS',
          ],
          default_portion: {
            amount: 2,
            unit: 'CUPS',
          },
        },
      ],
      supportedDispensePresets: [
        {
          preset_name: 'herb garden',
          preset_name_synonyms: [
            {
              lang: 'en',
              synonyms: ['herb garden'],
            },
          ],
        },
      ],
    },
  },
];
