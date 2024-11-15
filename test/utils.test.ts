import { parseCookies } from '@/utils';

describe('utils tests suite', () => {
  describe('parseCookies', () => {
    it('Should parse cookies', () => {
      const cookies = ['cookie1=value1; cookie2=value2'];
      const result = parseCookies(cookies);
      expect(result).toStrictEqual({
        cookie1: 'value1',
        cookie2: 'value2',
      });
    });
  });
});
