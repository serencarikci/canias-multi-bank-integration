"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProcessingRunService = void 0;
class ProcessingRunService {
    running = false;
    state = {
        isRunning: false,
        lastRunStart: null,
        lastRunEnd: null,
        lastRunOutcome: null,
        lastSuccessfulRun: null,
        totalInserted: 0,
        totalDuplicates: 0,
        totalFiltered: 0,
        totalFailed: 0,
        totalReceived: 0,
    };
    getState() {
        return { ...this.state, isRunning: this.running };
    }
    tryAcquire() {
        if (this.running) {
            return false;
        }
        this.running = true;
        this.state.isRunning = true;
        return true;
    }
    release(outcome, success) {
        this.running = false;
        this.state.isRunning = false;
        this.state.lastRunEnd = new Date().toISOString();
        this.state.lastRunOutcome = outcome;
        if (success) {
            this.state.lastSuccessfulRun = this.state.lastRunEnd;
        }
    }
    markStart() {
        this.state.lastRunStart = new Date().toISOString();
    }
    addMetrics(metrics) {
        this.state.totalReceived += metrics.received;
        this.state.totalInserted += metrics.inserted;
        this.state.totalDuplicates += metrics.duplicates;
        this.state.totalFiltered += metrics.filtered;
        this.state.totalFailed += metrics.failed;
    }
}
exports.ProcessingRunService = ProcessingRunService;
