import { Product, FabricTier } from '@/types/quote';

// Helper to create prices object from array
const createPrices = (b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number): Record<FabricTier, number> => ({
  'FX B': b, 'FX C': c, 'FX D': d, 'FX E': e, 'FX F': f, 'FX G': g, 'FX H': h, 'FX I': i, 'FX J': j
});

export const DEFAULT_PRODUCTS: Product[] = [
  // AFAGO
  {
    id: 'afago',
    code: '20488',
    name: 'AFAGO',
    description: 'Sofá com design moderno e confortável',
    category: 'Sofás',
    hasBase: false,
    availableBases: [],
    modulations: [
      { name: '1B + 1B 0,85m + 0,85m', description: 'AFAGO 1B + 1B 0,85 m + 0,85 m x 0,83 m (2ENC)', dimensions: '0,85 m + 0,85 m x 0,83 m', prices: createPrices(3692, 3927, 4257, 4409, 4624, 4886, 5238, 5652, 7689) },
      { name: '1B + 1B 0,95m + 0,95m', description: 'AFAGO 1B + 1B 0,95 m + 0,95 m x 0,83 m (2ENC)', dimensions: '0,95 m + 0,95 m x 0,83 m', prices: createPrices(3952, 4205, 4558, 4725, 4956, 5238, 5619, 6066, 8262) },
      { name: '1B + 1B 1,05m + 1,05m', description: 'AFAGO 1B + 1B 1,05 m + 1,05 m x 0,83 m (2ENC)', dimensions: '1,05 m + 1,05 m x 0,83 m', prices: createPrices(4230, 4503, 4886, 5066, 5315, 5620, 6033, 6517, 8895) },
      { name: '1B + 1B 1,15m + 1,15m', description: 'AFAGO 1B + 1B 1,15 m + 1,15 m x 0,83 m (2ENC)', dimensions: '1,15 m + 1,15 m x 0,83 m', prices: createPrices(4484, 4778, 5189, 5382, 5651, 5977, 6419, 6939, 9491) },
      { name: '1B + 1B 1,25m + 1,25m', description: 'AFAGO 1B + 1B 1,25 m + 1,25 m x 0,83 m (2ENC)', dimensions: '1,25 m + 1,25 m x 0,83 m', prices: createPrices(4738, 5052, 5491, 5697, 5986, 6336, 6808, 7365, 10092) },
      { name: '1B + 1B 1,35m + 1,35m', description: 'AFAGO 1B + 1B 1,35 m + 1,35 m x 0,83 m (2ENC)', dimensions: '1,35 m + 1,35 m x 0,83 m', prices: createPrices(4988, 5320, 5787, 6004, 6309, 6678, 7179, 7769, 10656) },
      { name: '1B + 1B 1,45m + 1,45m', description: 'AFAGO 1B + 1B 1,45 m + 1,45 m x 0,83 m (2ENC)', dimensions: '1,45 m + 1,45 m x 0,83 m', prices: createPrices(5088, 5439, 5932, 6164, 6486, 6877, 7409, 8032, 11091) },
      { name: '2B 1AS 1,70m', description: 'AFAGO 2B 1AS 1,70 m x 0,83 m (2ENC)', dimensions: '1,70 m x 0,83 m', prices: createPrices(3726, 3947, 4257, 4401, 4603, 4850, 5184, 5575, 7496) },
      { name: '2B 1AS 1,90m', description: 'AFAGO 2B 1AS 1,90 m x 0,83 m (2ENC)', dimensions: '1,90 m x 0,83 m', prices: createPrices(4021, 4265, 4606, 4765, 4988, 5259, 5626, 6057, 8172) },
      { name: '2B 1AS 2,10m', description: 'AFAGO 2B 1AS 2,10 m x 0,83 m (2ENC)', dimensions: '2,10 m x 0,83 m', prices: createPrices(4318, 4581, 4952, 5123, 5365, 5659, 6057, 6524, 8816) },
      { name: '2B 1AS 2,30m', description: 'AFAGO 2B 1AS 2,30 m x 0,83 m (3ENC)', dimensions: '2,30 m x 0,83 m', prices: createPrices(4698, 4988, 5393, 5583, 5848, 6172, 6609, 7120, 9636) },
      { name: '2B 1AS 2,50m', description: 'AFAGO 2B 1AS 2,50 m x 0,83 m (3ENC)', dimensions: '2,50 m x 0,83 m', prices: createPrices(4989, 5300, 5735, 5938, 6222, 6568, 7038, 7587, 10287) },
      { name: '2B 1AS 2,70m', description: 'AFAGO 2B 1AS 2,70 m x 0,83 m (3ENC)', dimensions: '2,70 m x 0,83 m', prices: createPrices(5280, 5608, 6075, 6291, 6593, 6963, 7462, 8049, 10928) },
      { name: '2B 1AS 2,90m', description: 'AFAGO 2B 1AS 2,90 m x 0,83 m (3ENC)', dimensions: '2,90 m x 0,83 m', prices: createPrices(5584, 5936, 6428, 6659, 6983, 7374, 7905, 8527, 11586) },
      { name: '2B 1AS 3,10m', description: 'AFAGO 2B 1AS 3,10 m x 0,83 m (3ENC)', dimensions: '3,10 m x 0,83 m', prices: createPrices(5901, 6273, 6796, 7039, 7380, 7796, 8358, 9018, 12256) },
      { name: '2B 1AS 3,30m', description: 'AFAGO 2B 1AS 3,30 m x 0,83 m (3ENC)', dimensions: '3,30 m x 0,83 m', prices: createPrices(6223, 6615, 7167, 7424, 7786, 8224, 8816, 9512, 12931) },
    ],
  },
  // ALENTO
  {
    id: 'alento',
    code: '20486',
    name: 'ALENTO',
    description: 'Sofá elegante com múltiplas configurações',
    category: 'Sofás',
    hasBase: true,
    availableBases: ['FOSCA/METALIZADO', 'MTX'],
    modulations: [
      { name: '1B + PUFF BI 1,05m + 0,80m', description: 'ALENTO 1B + PUFF BI 1,05 m + 0,80 m x 1,00 m', dimensions: '1,05 m + 0,80 m x 1,00 m', prices: createPrices(4022, 4211, 4472, 4583, 4732, 4918, 5166, 5457, 6928) },
      { name: '1B + PUFF BI 1,15m + 0,90m', description: 'ALENTO 1B + PUFF BI 1,15 m + 0,90 m x 1,00 m', dimensions: '1,15 m + 0,90 m x 1,00 m', prices: createPrices(4298, 4503, 4788, 4907, 5069, 5269, 5538, 5856, 7450) },
      { name: '1B + PUFF BI 1,25m + 1,00m', description: 'ALENTO 1B + PUFF BI 1,25 m + 1,00 m x 1,00 m', dimensions: '1,25 m + 1,00 m x 1,00 m', prices: createPrices(4548, 4767, 5073, 5200, 5379, 5594, 5885, 6227, 7947) },
      { name: '1B 1AS 1,05m', description: 'ALENTO 1B 1AS 1,05 m x 1,00 m', dimensions: '1,05 m x 1,00 m', prices: createPrices(2816, 2964, 3172, 3257, 3378, 3523, 3720, 3950, 5113) },
      { name: '1B 1AS 1,15m', description: 'ALENTO 1B 1AS 1,15 m x 1,00 m', dimensions: '1,15 m x 1,00 m', prices: createPrices(2968, 3131, 3358, 3451, 3583, 3739, 3954, 4206, 5472) },
      { name: '1B 1AS 1,25m', description: 'ALENTO 1B 1AS 1,25 m x 1,00 m', dimensions: '1,25 m x 1,00 m', prices: createPrices(3123, 3297, 3542, 3643, 3783, 3954, 4187, 4457, 5825) },
      { name: '1B 2AS 1,85m', description: 'ALENTO 1B 2AS 1,85 m x 1,00 m', dimensions: '1,85 m x 1,00 m', prices: createPrices(4116, 4368, 4720, 4866, 5069, 5315, 5649, 6040, 8011) },
      { name: '1B 2AS 2,05m', description: 'ALENTO 1B 2AS 2,05 m x 1,00 m', dimensions: '2,05 m x 1,00 m', prices: createPrices(4439, 4720, 5112, 5274, 5500, 5776, 6147, 6585, 8780) },
      { name: '1B 2AS 2,25m', description: 'ALENTO 1B 2AS 2,25 m x 1,00 m', dimensions: '2,25 m x 1,00 m', prices: createPrices(4950, 5260, 5695, 5874, 6126, 6428, 6840, 7323, 9753) },
      { name: '2B 2AS 2,10m', description: 'ALENTO 2B 2AS 2,10 m x 1,00 m', dimensions: '2,10 m x 1,00 m', prices: createPrices(4414, 4702, 5103, 5268, 5498, 5779, 6159, 6603, 8844) },
      { name: '2B 2AS 2,30m', description: 'ALENTO 2B 2AS 2,30 m x 1,00 m', dimensions: '2,30 m x 1,00 m', prices: createPrices(4900, 5212, 5649, 5828, 6079, 6385, 6797, 7283, 9720) },
      { name: '2B 2AS 2,50m', description: 'ALENTO 2B 2AS 2,50 m x 1,00 m', dimensions: '2,50 m x 1,00 m', prices: createPrices(5209, 5546, 6018, 6214, 6485, 6817, 7264, 7790, 10432) },
      { name: 'CH 1B 1,05m', description: 'ALENTO CH 1B 1,05 m x 1,60 m', dimensions: '1,05 m x 1,60 m', prices: createPrices(3592, 3776, 4035, 4143, 4292, 4471, 4716, 5005, 6451) },
      { name: 'CH 1B 1,15m', description: 'ALENTO CH 1B 1,15 m x 1,60 m', dimensions: '1,15 m x 1,60 m', prices: createPrices(3807, 4007, 4286, 4400, 4564, 4758, 5024, 5336, 6902) },
    ],
  },
  // BOLD
  {
    id: 'bold',
    code: '20584',
    name: 'BOLD',
    description: 'Design arrojado com acabamento premium',
    category: 'Sofás',
    hasBase: false,
    availableBases: [],
    modulations: [
      { name: '1B 2AS 1,82m', description: 'BOLD 1B 2AS 1,82 m x 1,10 m (2ENC/2LOMB)', dimensions: '1,82 m x 1,10 m', prices: createPrices(3451, 3718, 4090, 4277, 4539, 4857, 5287, 5792, 8688) },
      { name: '1B 2AS 2,02m', description: 'BOLD 1B 2AS 2,02 m x 1,10 m (2ENC/2LOMB)', dimensions: '2,02 m x 1,10 m', prices: createPrices(3794, 4089, 4502, 4709, 4999, 5351, 5826, 6385, 9590) },
      { name: '1B 2AS 2,22m', description: 'BOLD 1B 2AS 2,22 m x 1,10 m (2ENC/2LOMB)', dimensions: '2,22 m x 1,10 m', prices: createPrices(4155, 4479, 4934, 5161, 5479, 5866, 6389, 7003, 10529) },
      { name: '1B 2AS 2,42m', description: 'BOLD 1B 2AS 2,42 m x 1,10 m (2ENC/2LOMB)', dimensions: '2,42 m x 1,10 m', prices: createPrices(4522, 4874, 5367, 5613, 5959, 6378, 6945, 7611, 11434) },
      { name: '2B 2AS 2,10m', description: 'BOLD 2B 2AS 2,10 m x 1,10 m (2ENC/2LOMB)', dimensions: '2,10 m x 1,10 m', prices: createPrices(3823, 4127, 4552, 4764, 5063, 5424, 5913, 6488, 9785) },
      { name: '2B 2AS 2,30m', description: 'BOLD 2B 2AS 2,30 m x 1,10 m (2ENC/2LOMB)', dimensions: '2,30 m x 1,10 m', prices: createPrices(4171, 4503, 4969, 5201, 5527, 5923, 6459, 7087, 10695) },
      { name: '2B 2AS 2,50m', description: 'BOLD 2B 2AS 2,50 m x 1,10 m (2ENC/2LOMB)', dimensions: '2,50 m x 1,10 m', prices: createPrices(4517, 4877, 5382, 5635, 5988, 6417, 6998, 7680, 11593) },
      { name: 'CH 1B 1,15m', description: 'BOLD CH 1B 1,15 m x 1,60 m (1ENC/1LOMB)', dimensions: '1,15 m x 1,60 m', prices: createPrices(2731, 2931, 3212, 3352, 3548, 3787, 4110, 4488, 6663) },
      { name: 'CH 1B 1,25m', description: 'BOLD CH 1B 1,25 m x 1,60 m (1ENC/1LOMB)', dimensions: '1,25 m x 1,60 m', prices: createPrices(2955, 3172, 3476, 3628, 3842, 4101, 4451, 4862, 7222) },
      { name: 'PUFF 0,70m', description: 'BOLD PUFF 0,70 m x 1,10 m', dimensions: '0,70 m x 1,10 m', prices: createPrices(1084, 1156, 1257, 1308, 1379, 1465, 1581, 1717, 2500) },
      { name: 'PUFF 0,90m', description: 'BOLD PUFF 0,90 m x 1,10 m', dimensions: '0,90 m x 1,10 m', prices: createPrices(1286, 1369, 1485, 1543, 1624, 1723, 1856, 2014, 2915) },
      { name: 'PUFF 1,10m', description: 'BOLD PUFF 1,10 m x 1,10 m', dimensions: '1,10 m x 1,10 m', prices: createPrices(1502, 1597, 1732, 1799, 1893, 2007, 2161, 2342, 3383) },
    ],
  },
  // BONOBO
  {
    id: 'bonobo',
    code: '20205',
    name: 'BONOBO',
    description: 'Poltrona moderna e versátil',
    category: 'Poltronas',
    hasBase: false,
    availableBases: [],
    modulations: [
      { name: '1B 1AS 0,70m', description: 'BONOBO 1B 1AS 0,70 m x 1,05 m (1ENC)', dimensions: '0,70 m x 1,05 m', prices: createPrices(2097, 2233, 2458, 2730, 3063, 3431, 3846, 4312, 6150) },
      { name: '1B 1AS 0,80m', description: 'BONOBO 1B 1AS 0,80 m x 1,05 m (1ENC)', dimensions: '0,80 m x 1,05 m', prices: createPrices(2270, 2418, 2664, 2962, 3323, 3730, 4182, 4690, 6688) },
      { name: '1B 1AS 0,90m', description: 'BONOBO 1B 1AS 0,90 m x 1,05 m (1ENC)', dimensions: '0,90 m x 1,05 m', prices: createPrices(2509, 2669, 2936, 3256, 3647, 4085, 4573, 5120, 7278) },
      { name: '1B 1AS 1,00m', description: 'BONOBO 1B 1AS 1,00 m x 1,05 m (1ENC)', dimensions: '1,00 m x 1,05 m', prices: createPrices(2615, 2789, 3073, 3418, 3836, 4306, 4831, 5423, 7739) },
      { name: '2B 2AS 1,40m', description: 'BONOBO 2B 2AS 1,40 m x 1,05 m (2ENC)', dimensions: '1,40 m x 1,05 m', prices: createPrices(3784, 4040, 4462, 4973, 5591, 6287, 7069, 7947, 11390) },
      { name: '2B 2AS 1,60m', description: 'BONOBO 2B 2AS 1,60 m x 1,05 m (2ENC)', dimensions: '1,60 m x 1,05 m', prices: createPrices(4076, 4351, 4809, 5367, 6040, 6801, 7655, 8619, 12350) },
      { name: '2B 2AS 1,80m', description: 'BONOBO 2B 2AS 1,80 m x 1,05 m (2ENC)', dimensions: '1,80 m x 1,05 m', prices: createPrices(4460, 4758, 5254, 5852, 6578, 7392, 8310, 9339, 13356) },
    ],
  },
  // NIMBUS
  {
    id: 'nimbus',
    code: '21143',
    name: 'NIMBUS',
    description: 'Conforto supremo com design contemporâneo',
    category: 'Sofás',
    hasBase: false,
    availableBases: [],
    modulations: [
      { name: '1B 1AS 1,00m', description: 'NIMBUS 1B 1AS 1,00 m x 1,17 m (2DEC)', dimensions: '1,00 m x 1,17 m', prices: createPrices(3002, 3189, 3450, 3557, 3707, 3889, 4136, 4425, 6009) },
      { name: '1B 1AS 1,10m', description: 'NIMBUS 1B 1AS 1,10 m x 1,17 m (2DEC)', dimensions: '1,10 m x 1,17 m', prices: createPrices(3312, 3509, 3785, 3897, 4057, 4249, 4510, 4816, 6490) },
      { name: '1B 1AS 1,20m', description: 'NIMBUS 1B 1AS 1,20 m x 1,17 m (2DEC)', dimensions: '1,20 m x 1,17 m', prices: createPrices(3477, 3685, 3974, 4092, 4259, 4462, 4734, 5055, 6809) },
      { name: '2B 2AS 2,00m', description: 'NIMBUS 2B 2AS 2,00 m x 1,17 m (4DEC)', dimensions: '2,00 m x 1,17 m', prices: createPrices(5589, 5917, 6376, 6566, 6830, 7150, 7584, 8094, 10882) },
      { name: '2B 2AS 2,20m', description: 'NIMBUS 2B 2AS 2,20 m x 1,17 m (4DEC)', dimensions: '2,20 m x 1,17 m', prices: createPrices(5975, 6322, 6806, 7004, 7282, 7620, 8076, 8613, 11546) },
      { name: '2B 2AS 2,40m', description: 'NIMBUS 2B 2AS 2,40 m x 1,17 m (4DEC)', dimensions: '2,40 m x 1,17 m', prices: createPrices(6295, 6656, 7162, 7368, 7659, 8012, 8491, 9053, 12120) },
      { name: '2B 2AS 2,60m', description: 'NIMBUS 2B 2AS 2,60 m x 1,17 m (6DEC)', dimensions: '2,60 m x 1,17 m', prices: createPrices(6970, 7393, 7985, 8227, 8568, 8979, 9539, 10194, 13780) },
      { name: 'SB 1AS 0,75m', description: 'NIMBUS SB 1AS 0,75 m x 1,17 m (2DEC)', dimensions: '0,75 m x 1,17 m', prices: createPrices(2604, 2764, 2989, 3082, 3212, 3368, 3582, 3832, 5199) },
    ],
  },
  // OASI
  {
    id: 'oasi',
    code: '20663',
    name: 'OASI',
    description: 'Elegância e sofisticação em cada detalhe',
    category: 'Sofás',
    hasBase: true,
    availableBases: ['FOSCA/METALIZADO', 'MTX'],
    modulations: [
      { name: '1B + 1B 1,00m + 1,00m', description: 'OASI 1B + 1B 1,00 m + 1,00 m x 0,85 m x 0,63 m', dimensions: '1,00 m + 1,00 m x 0,85 m', prices: createPrices(4912, 5188, 5573, 5732, 5954, 6224, 6589, 7017, 9477) },
      { name: '1B + 1B 1,10m + 1,10m', description: 'OASI 1B + 1B 1,10 m + 1,10 m x 0,85 m x 0,63 m', dimensions: '1,10 m + 1,10 m x 0,85 m', prices: createPrices(5153, 5445, 5852, 6020, 6255, 6540, 6927, 7380, 9983) },
      { name: '1B 1AS 1,00m', description: 'OASI 1B 1AS 1,00 m x 0,85 m x 0,63 m', dimensions: '1,00 m x 0,85 m', prices: createPrices(3054, 3192, 3385, 3465, 3575, 3711, 3893, 4107, 5337) },
      { name: '1B 1AS 1,10m', description: 'OASI 1B 1AS 1,10 m x 0,85 m x 0,63 m', dimensions: '1,10 m x 0,85 m', prices: createPrices(3238, 3384, 3588, 3672, 3790, 3933, 4126, 4353, 5655) },
      { name: '1B 2AS 1,70m', description: 'OASI 1B 2AS 1,70 m x 0,85 m x 0,63 m', dimensions: '1,70 m x 0,85 m', prices: createPrices(4214, 4438, 4751, 4880, 5060, 5280, 5576, 5925, 7924) },
      { name: '1B 2AS 1,90m', description: 'OASI 1B 2AS 1,90 m x 0,85 m x 0,63 m', dimensions: '1,90 m x 0,85 m', prices: createPrices(4451, 4691, 5028, 5166, 5359, 5594, 5913, 6286, 8430) },
      { name: '2B 2AS 2,00m', description: 'OASI 2B 2AS 2,00 m x 0,85 m x 0,63 m', dimensions: '2,00 m x 0,85 m', prices: createPrices(4816, 5072, 5430, 5577, 5784, 6034, 6373, 6771, 9055) },
      { name: '2B 2AS 2,20m', description: 'OASI 2B 2AS 2,20 m x 0,85 m x 0,63 m', dimensions: '2,20 m x 0,85 m', prices: createPrices(5072, 5345, 5726, 5883, 6103, 6369, 6730, 7153, 9585) },
    ],
  },
  // MODUM
  {
    id: 'modum',
    code: '21179',
    name: 'MODUM',
    description: 'Modular e versátil para qualquer ambiente',
    category: 'Modulares',
    hasBase: false,
    availableBases: [],
    modulations: [
      { name: 'PUFF CTO 0,60m', description: 'MODUM PUFF CTO 0,60 m x 0,60 m x 0,43 m', dimensions: '0,60 m x 0,60 m', prices: createPrices(779, 833, 909, 944, 994, 1054, 1137, 1232, 1776) },
      { name: 'PUFF CTO 0,70m', description: 'MODUM PUFF CTO 0,70 m x 0,70 m x 0,43 m', dimensions: '0,70 m x 0,70 m', prices: createPrices(860, 919, 1003, 1042, 1098, 1166, 1260, 1369, 1980) },
      { name: 'PUFF MEIO 0,80m', description: 'MODUM PUFF MEIO 0,80 m x 1,10 m x 0,43 m', dimensions: '0,80 m x 1,10 m', prices: createPrices(1216, 1296, 1408, 1459, 1532, 1619, 1738, 1878, 2677) },
      { name: 'PUFF MEIO 0,90m', description: 'MODUM PUFF MEIO 0,90 m x 1,10 m x 0,43 m', dimensions: '0,90 m x 1,10 m', prices: createPrices(1314, 1399, 1518, 1574, 1651, 1745, 1872, 2022, 2877) },
      { name: 'SB 1AS 0,80m', description: 'MODUM SB 1AS 0,80 m x 1,10 m x 0,62 m (1ENC/1DEC)', dimensions: '0,80 m x 1,10 m', prices: createPrices(2063, 2205, 2403, 2494, 2623, 2777, 2988, 3235, 4653) },
      { name: 'SB 1AS 0,90m', description: 'MODUM SB 1AS 0,90 m x 1,10 m x 0,62 m (1ENC/1DEC)', dimensions: '0,90 m x 1,10 m', prices: createPrices(2216, 2369, 2583, 2680, 2818, 2986, 3213, 3479, 5007) },
      { name: 'SB BI 1,30m', description: 'MODUM SB BI 1,30 m x 1,10 m x 0,62 m (1ENC/1DEC)', dimensions: '1,30 m x 1,10 m', prices: createPrices(2243, 2387, 2588, 2682, 2811, 2970, 3184, 3434, 4876) },
      { name: 'SB BI 1,40m', description: 'MODUM SB BI 1,40 m x 1,10 m x 0,62 m (1ENC/1DEC)', dimensions: '1,40 m x 1,10 m', prices: createPrices(2378, 2532, 2747, 2846, 2985, 3153, 3382, 3649, 5186) },
    ],
  },
  // NUVIA PUFF
  {
    id: 'nuvia',
    code: '23061',
    name: 'NUVIA',
    description: 'Puff elegante com pé',
    category: 'Puffs',
    hasBase: false,
    availableBases: [],
    modulations: [
      { name: 'PUFF 0,60m', description: 'NUVIA PUFF 0,60 m x 0,60 m x 0,40 m PE', dimensions: '0,60 m x 0,60 m', prices: createPrices(502, 535, 583, 604, 633, 668, 716, 773, 1097) },
      { name: 'PUFF 0,80m', description: 'NUVIA PUFF 0,80 m x 0,80 m x 0,40 m PE', dimensions: '0,80 m x 0,80 m', prices: createPrices(774, 819, 883, 910, 950, 997, 1063, 1138, 1574) },
      { name: 'PUFF 1,00m', description: 'NUVIA PUFF 1,00 m x 1,00 m x 0,40 m PE', dimensions: '1,00 m x 1,00 m', prices: createPrices(1228, 1313, 1432, 1485, 1558, 1649, 1770, 1913, 2732) },
    ],
  },
];

export const PRODUCT_CATEGORIES = ['Sofás', 'Poltronas', 'Puffs', 'Modulares', 'Outros'] as const;

export const BASE_OPTIONS = [
  'FOSCA/METALIZADO',
  'MTX',
  'Madeira natural',
  'Madeira escura',
  'Pés palito',
  'Sem pés',
  'Inox',
  'Cromado',
];
