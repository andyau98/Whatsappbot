/**
 * 測試 Weather 工具
 */

const WeatherTool = require('./tools/weather');

async function testWeather() {
    console.log('\n' + '='.repeat(60));
    console.log('🌤️  Weather 工具測試');
    console.log('='.repeat(60) + '\n');

    const weatherTool = new WeatherTool({ verbose: true });

    // 測試 1: 查詢香港天氣
    console.log('📍 測試 1: 查詢香港天氣');
    console.log('-'.repeat(40));
    try {
        const result = await weatherTool.run('Hong Kong');
        console.log(result);
        console.log('✅ 測試 1 通過\n');
    } catch (error) {
        console.error('❌ 測試 1 失敗:', error.message);
    }

    // 測試 2: 查詢台北天氣
    console.log('\n📍 測試 2: 查詢台北天氣');
    console.log('-'.repeat(40));
    try {
        const result = await weatherTool.run('Taipei');
        console.log(result);
        console.log('✅ 測試 2 通過\n');
    } catch (error) {
        console.error('❌ 測試 2 失敗:', error.message);
    }

    // 測試 3: 查詢東京天氣
    console.log('\n📍 測試 3: 查詢東京天氣');
    console.log('-'.repeat(40));
    try {
        const result = await weatherTool.run('Tokyo');
        console.log(result);
        console.log('✅ 測試 3 通過\n');
    } catch (error) {
        console.error('❌ 測試 3 失敗:', error.message);
    }

    console.log('='.repeat(60));
    console.log('🎉 測試完成！');
    console.log('='.repeat(60) + '\n');
}

testWeather().catch(console.error);
