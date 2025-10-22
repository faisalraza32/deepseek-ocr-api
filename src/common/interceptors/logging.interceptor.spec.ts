import { CallHandler, ExecutionContext } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { of, throwError } from 'rxjs';
import { LoggingInterceptor } from './logging.interceptor';

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;

  const mockRequest = {
    method: 'GET',
    url: '/test',
    ip: '127.0.0.1',
    headers: {
      'user-agent': 'test-agent',
    },
    body: {},
  };

  const mockResponse = {
    statusCode: 200,
  };

  const mockExecutionContext = {
    switchToHttp: () => ({
      getRequest: () => mockRequest,
      getResponse: () => mockResponse,
    }),
  } as ExecutionContext;

  const mockCallHandler: CallHandler = {
    handle: () => of({ data: 'test' }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LoggingInterceptor],
    }).compile();

    interceptor = module.get<LoggingInterceptor>(LoggingInterceptor);
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('should log request and response', (done) => {
    const logSpy = jest.spyOn(interceptor['logger'], 'log');
    const debugSpy = jest.spyOn(interceptor['logger'], 'debug');

    interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe(() => {
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Incoming GET /test'));
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('GET /test 200'));
      done();
    });
  });

  it('should add requestId to request', (done) => {
    interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe(() => {
      expect(mockRequest['requestId']).toBeDefined();
      expect(typeof mockRequest['requestId']).toBe('string');
      done();
    });
  });

  it('should log request body if present', (done) => {
    const contextWithBody = {
      switchToHttp: () => ({
        getRequest: () => ({
          ...mockRequest,
          body: { key: 'value' },
        }),
        getResponse: () => mockResponse,
      }),
    } as ExecutionContext;

    const debugSpy = jest.spyOn(interceptor['logger'], 'debug');

    interceptor
      .intercept(contextWithBody, {
        handle: () => of({ data: 'test' }),
      } as CallHandler)
      .subscribe(() => {
        expect(debugSpy).toHaveBeenCalledWith(expect.stringContaining('Request body:'));
        done();
      });
  });

  it('should log response size', (done) => {
    const debugSpy = jest.spyOn(interceptor['logger'], 'debug');

    interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe(() => {
      expect(debugSpy).toHaveBeenCalledWith(expect.stringContaining('Response size:'));
      done();
    });
  });

  it('should log errors', (done) => {
    const error = new Error('Test error');
    const errorSpy = jest.spyOn(interceptor['logger'], 'error');

    const errorHandler: CallHandler = {
      handle: () => throwError(() => error),
    };

    interceptor.intercept(mockExecutionContext, errorHandler).subscribe({
      error: () => {
        expect(errorSpy).toHaveBeenCalledWith(
          expect.stringContaining('Error: Test error'),
          expect.any(String),
        );
        done();
      },
    });
  });

  it('should handle requests with no user-agent', (done) => {
    const contextNoAgent = {
      switchToHttp: () => ({
        getRequest: () => ({
          ...mockRequest,
          headers: {},
        }),
        getResponse: () => mockResponse,
      }),
    } as ExecutionContext;

    const logSpy = jest.spyOn(interceptor['logger'], 'log');

    interceptor
      .intercept(contextNoAgent, {
        handle: () => of({ data: 'test' }),
      } as CallHandler)
      .subscribe(() => {
        expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('UserAgent: unknown'));
        done();
      });
  });
});
