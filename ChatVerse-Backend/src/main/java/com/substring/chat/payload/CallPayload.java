package com.substring.chat.payload;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CallPayload {
    private String type; // 'offer', 'answer', 'candidate'
    private Object data;
    private String from;
    private String to;
    private String roomId;
}
