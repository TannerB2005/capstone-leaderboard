import { TestBed } from '@angular/core/testing';

import { CSVparserService } from './csvparser.service';

describe('CSVparserService', () => {
  let service: CSVparserService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CSVparserService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
