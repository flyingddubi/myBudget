package com.doyoun.mybudget;

import android.os.Bundle;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    /* WebView·콘텐츠가 시스템 내비게이션 바 뒤로 깔리지 않도록 */
    WindowCompat.setDecorFitsSystemWindows(getWindow(), true);
  }
}
