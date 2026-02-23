package com.substring.chat.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.listener.DefaultErrorHandler;
import org.springframework.util.backoff.FixedBackOff;

@Configuration
public class KafkaRetryConfig {

    /**
     * Enterprise Retry Mechanism:
     * If a consumer fails (e.g., DB down), it retries 3 times with 2-second
     * intervals
     * before sending the message to a Dead Letter Topic (optional) or logging it.
     */
    @Bean
    public DefaultErrorHandler errorHandler() {
        return new DefaultErrorHandler(new FixedBackOff(2000L, 3));
    }
}
