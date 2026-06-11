import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { CsvService } from './csvparser.service';
import { environment } from '../environments/environment';

describe('CsvService', () => {
  let svc: CsvService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
    svc = TestBed.inject(CsvService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  describe('getCarriers()', () => {
    it('parses CSV rows into CarrierRow objects', () => {
      const csv = `TrnspCode,CarrierName,TruckType\n1,Alpha Freight,LTL\n2,Beta Haulers,TL\n`;
      let result: any;
      svc.getCarriers().subscribe(r => result = r);

      http.expectOne(environment.csvPaths.carriers).flush(csv);

      expect(result.length).toBe(2);
      expect(result[0]).toEqual({ TrnspCode: 1, CarrierName: 'Alpha Freight', TruckType: 'LTL' });
      expect(result[1]).toEqual({ TrnspCode: 2, CarrierName: 'Beta Haulers',  TruckType: 'TL'  });
    });

    it('skips empty lines', () => {
      const csv = `TrnspCode,CarrierName,TruckType\n1,Alpha,LTL\n\n`;
      let result: any;
      svc.getCarriers().subscribe(r => result = r);
      http.expectOne(environment.csvPaths.carriers).flush(csv);
      expect(result.length).toBe(1);
    });

    it('emits a descriptive error on HTTP failure', () => {
      let err: Error | undefined;
      svc.getCarriers().subscribe({ error: e => err = e });
      http.expectOne(environment.csvPaths.carriers).error(new ErrorEvent('network', { message: '404' }));
      expect(err).toBeDefined();
      expect(err!.message).toContain('Failed to load carriers');
    });
  });

  describe('getQuotesActual()', () => {
    it('parses CSV rows into QuoteActualRow objects', () => {
      const csv = `Quote Date,Carrier,Weight,Quote,Amount\n2024-01-15,1,500,200.00,210.50\n`;
      let result: any;
      svc.getQuotesActual().subscribe(r => result = r);
      http.expectOne(environment.csvPaths.quotesActual).flush(csv);

      expect(result.length).toBe(1);
      expect(result[0].carrier).toBe(1);
      expect(result[0].weight).toBe(500);
      expect(result[0].quote).toBeCloseTo(200);
      expect(result[0].amount).toBeCloseTo(210.5);
      expect(result[0].quoteDate).toEqual(jasmine.any(Date));
    });

    it('emits a descriptive error on HTTP failure', () => {
      let err: Error | undefined;
      svc.getQuotesActual().subscribe({ error: e => err = e });
      http.expectOne(environment.csvPaths.quotesActual).error(new ErrorEvent('network', { message: '500' }));
      expect(err!.message).toContain('Failed to load quotes');
    });
  });

  describe('getDeliveries()', () => {
    it('parses CSV rows into DeliveryRow objects', () => {
      const csv = `carrier,pickup,delivery,expected_delivery\n1,2024-01-01,2024-01-05,2024-01-04\n`;
      let result: any;
      svc.getDeliveries().subscribe(r => result = r);
      http.expectOne(environment.csvPaths.deliveries).flush(csv);

      expect(result.length).toBe(1);
      expect(result[0].carrier).toBe(1);
      expect(result[0].pickup).toEqual(jasmine.any(Date));
      expect(result[0].delivery).toEqual(jasmine.any(Date));
      expect(result[0].expected_delivery).toEqual(jasmine.any(Date));
    });

    it('emits a descriptive error on HTTP failure', () => {
      let err: Error | undefined;
      svc.getDeliveries().subscribe({ error: e => err = e });
      http.expectOne(environment.csvPaths.deliveries).error(new ErrorEvent('network', { message: '503' }));
      expect(err!.message).toContain('Failed to load deliveries');
    });
  });
});
